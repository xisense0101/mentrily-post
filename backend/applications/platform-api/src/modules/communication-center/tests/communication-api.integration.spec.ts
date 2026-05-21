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

describe('Communication Center API (integration)', () => {
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
        return prismaRef.$transaction(async (tx) => operation({ transactionId: randomUUID(), client: tx })) as Promise<T>;
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_EVALUATOR)
      .useValue(permissionEvaluator)
      .overrideProvider(TRANSACTION_RUNNER)
      .useValue(transactionRunner)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { rawBody: true });
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

  it('creates, renders, lists, archives template and creates, lists, updates intent', async () => {
    const createTemplateRes = await app.inject({
      method: 'POST',
      url: '/workspace/communication/templates',
      headers,
      payload: {
        key: 'welcome_email',
        name: 'Welcome Email',
        channel: 'EMAIL',
        subjectTemplate: 'Hello {{name}}',
        bodyTemplate: 'Welcome {{name}}',
        variables: ['name'],
        activate: true,
      },
    });
    expect(createTemplateRes.statusCode).toBe(201);
    const template = createTemplateRes.json<{ id: string }>();

    const renderRes = await app.inject({
      method: 'POST',
      url: `/workspace/communication/templates/${template.id}/render`,
      headers,
      payload: { variables: { name: 'Ada' } },
    });
    expect(renderRes.statusCode).toBe(201);

    const listTemplateRes = await app.inject({ method: 'GET', url: '/workspace/communication/templates', headers });
    expect(listTemplateRes.statusCode).toBe(200);
    expect(listTemplateRes.json()).toHaveLength(1);

    const createIntentRes = await app.inject({
      method: 'POST',
      url: '/workspace/communication/intents',
      headers,
      payload: {
        templateId: template.id,
        channel: 'EMAIL',
        recipient: { email: 'user@example.com' },
        variables: { name: 'Ada' },
      },
    });
    expect(createIntentRes.statusCode).toBe(201);
    const intent = createIntentRes.json<{ id: string }>();

    const smsIntentRes = await app.inject({
      method: 'POST',
      url: '/workspace/communication/intents',
      headers,
      payload: {
        channel: 'SMS',
        recipient: { phoneNumber: '+123456789' },
        body: 'SMS body',
      },
    });
    expect(smsIntentRes.statusCode).toBe(201);

    const listIntentRes = await app.inject({ method: 'GET', url: '/workspace/communication/intents', headers });
    expect(listIntentRes.statusCode).toBe(200);
    expect(listIntentRes.json()).toHaveLength(2);

    const dispatchRes = await app.inject({
      method: 'POST',
      url: `/workspace/communication/intents/${intent.id}/mark-dispatched`,
      headers,
      payload: { provider: 'FIXTURE' },
    });
    expect(dispatchRes.statusCode).toBe(201);

    const archiveRes = await app.inject({
      method: 'POST',
      url: `/workspace/communication/templates/${template.id}/archive`,
      headers,
    });
    expect(archiveRes.statusCode).toBe(201);
  });
});
