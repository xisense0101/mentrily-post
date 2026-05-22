import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '@mentrily/data-platform';
import {
  PERMISSION_EVALUATOR,
  TRANSACTION_RUNNER,
  type PermissionEvaluator,
  type TransactionRunner,
} from '@mentrily/service-core';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { AppModule } from '../../app.module.js';
import { registerCorrelationIdHook } from '../../../foundation/correlation-id.hook.js';

describe('Notification Inbox and Preferences API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const headers = {
    'x-request-id': '11111111-1111-4111-8111-111111111111',
    'x-correlation-id': '22222222-2222-4222-8222-222222222222',
    'x-tenant-id': '33333333-3333-4333-8333-333333333333',
    'x-workspace-id': '44444444-4444-4444-8444-444444444444',
    'x-actor-id': '55555555-5555-4555-8555-555555555555',
  } as const;

  beforeAll(async () => {
    let prismaRef: PrismaService | undefined;
    const permissionEvaluator: PermissionEvaluator = { evaluate: async () => ({ allowed: true }) };
    const transactionRunner: TransactionRunner = {
      run: async <T>(operation: Parameters<TransactionRunner['run']>[0]): Promise<T> => {
        if (!prismaRef) throw new Error('prismaRef not initialized');
        return prismaRef.$transaction(async (tx) =>
          operation({ transactionId: randomUUID(), client: tx }),
        ) as Promise<T>;
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_EVALUATOR)
      .useValue(permissionEvaluator)
      .overrideProvider(TRANSACTION_RUNNER)
      .useValue(transactionRunner)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      rawBody: true,
    });
    registerCorrelationIdHook(app.getHttpAdapter().getInstance());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    prismaRef = prisma;
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('manages notification preferences and inbox notifications', async () => {
    // 1. Get preferences (should default to enabled: true for 21 combos)
    const getPrefsRes = await app.inject({
      method: 'GET',
      url: '/workspace/communication/preferences',
      headers,
    });
    expect(getPrefsRes.statusCode).toBe(200);
    const prefs = getPrefsRes.json<{ preferences: any[] }>().preferences;
    expect(prefs).toHaveLength(21);
    expect(prefs.every((p) => p.enabled === true)).toBe(true);

    // 2. Update preference: EMAIL + COURSE to false
    const updatePrefRes = await app.inject({
      method: 'POST',
      url: '/workspace/communication/preferences',
      headers,
      payload: {
        channel: 'EMAIL',
        category: 'COURSE',
        enabled: false,
      },
    });
    expect(updatePrefRes.statusCode).toBe(201);
    expect(updatePrefRes.json().enabled).toBe(false);

    // 3. Get preferences again and verify the course preference is false
    const getPrefsRes2 = await app.inject({
      method: 'GET',
      url: '/workspace/communication/preferences',
      headers,
    });
    expect(getPrefsRes2.statusCode).toBe(200);
    const prefs2 = getPrefsRes2.json<{ preferences: any[] }>().preferences;
    const emailCourse = prefs2.find((p) => p.channel === 'EMAIL' && p.category === 'COURSE');
    expect(emailCourse.enabled).toBe(false);

    // 4. Create an IN_APP intent for our actor
    const createIntentRes = await app.inject({
      method: 'POST',
      url: '/workspace/communication/intents',
      headers,
      payload: {
        channel: 'IN_APP',
        recipient: { principalId: headers['x-actor-id'] },
        body: 'You have a new assignment.',
      },
    });
    expect(createIntentRes.statusCode).toBe(201);
    const intent = createIntentRes.json<{ id: string }>();

    // Check inbox before dispatch (should be empty)
    const getUnreadRes0 = await app.inject({
      method: 'GET',
      url: '/workspace/communication/notifications/unread-count',
      headers,
    });
    expect(getUnreadRes0.statusCode).toBe(200);
    expect(getUnreadRes0.json().unreadCount).toBe(0);

    // 5. Dispatch it
    const dispatchRes = await app.inject({
      method: 'POST',
      url: `/workspace/communication/intents/${intent.id}/mark-dispatched`,
      headers,
      payload: { provider: 'FIXTURE' },
    });
    expect(dispatchRes.statusCode).toBe(201);

    // 6. Get unread count (should be 1)
    const getUnreadRes1 = await app.inject({
      method: 'GET',
      url: '/workspace/communication/notifications/unread-count',
      headers,
    });
    expect(getUnreadRes1.statusCode).toBe(200);
    expect(getUnreadRes1.json().unreadCount).toBe(1);

    // 7. List notifications (should return 1 notification)
    const listRes = await app.inject({
      method: 'GET',
      url: '/workspace/communication/notifications',
      headers,
    });
    expect(listRes.statusCode).toBe(200);
    const body = listRes.json<{ items: any[]; unreadCount: number }>();
    expect(body.items).toHaveLength(1);
    expect(body.unreadCount).toBe(1);
    expect(body.items[0].id).toBe(intent.id);
    expect(body.items[0].readAt).toBeUndefined();

    // 8. Get a single notification
    const getNotifRes = await app.inject({
      method: 'GET',
      url: `/workspace/communication/notifications/${intent.id}`,
      headers,
    });
    expect(getNotifRes.statusCode).toBe(200);
    expect(getNotifRes.json().id).toBe(intent.id);

    // 9. Mark read
    const markReadRes = await app.inject({
      method: 'POST',
      url: `/workspace/communication/notifications/${intent.id}/mark-read`,
      headers,
    });
    expect(markReadRes.statusCode).toBe(201);
    expect(markReadRes.json().readAt).toBeDefined();

    // 10. Check unread count is 0
    const getUnreadRes2 = await app.inject({
      method: 'GET',
      url: '/workspace/communication/notifications/unread-count',
      headers,
    });
    expect(getUnreadRes2.json().unreadCount).toBe(0);

    // 11. Mark unread
    const markUnreadRes = await app.inject({
      method: 'POST',
      url: `/workspace/communication/notifications/${intent.id}/mark-unread`,
      headers,
    });
    expect(markUnreadRes.statusCode).toBe(201);
    expect(markUnreadRes.json().readAt).toBeUndefined();

    // 12. Check unread count is 1
    const getUnreadRes3 = await app.inject({
      method: 'GET',
      url: '/workspace/communication/notifications/unread-count',
      headers,
    });
    expect(getUnreadRes3.json().unreadCount).toBe(1);

    // 13. Mark archived
    const archiveRes = await app.inject({
      method: 'POST',
      url: `/workspace/communication/notifications/${intent.id}/mark-archived`,
      headers,
    });
    expect(archiveRes.statusCode).toBe(201);
    expect(archiveRes.json().archivedAt).toBeDefined();

    // 14. Check unread count is 0
    const getUnreadRes4 = await app.inject({
      method: 'GET',
      url: '/workspace/communication/notifications/unread-count',
      headers,
    });
    expect(getUnreadRes4.json().unreadCount).toBe(0);

    // 15. Check list without archived returns 0
    const listRes2 = await app.inject({
      method: 'GET',
      url: '/workspace/communication/notifications',
      headers,
    });
    expect(listRes2.json().items).toHaveLength(0);

    // 16. Check list with archived returns 1
    const listRes3 = await app.inject({
      method: 'GET',
      url: '/workspace/communication/notifications?status=ARCHIVED',
      headers,
    });
    expect(listRes3.json().items).toHaveLength(1);
    expect(listRes3.json().items[0].id).toBe(intent.id);
  });
});
