import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import {
  PrismaNotificationDeliveryAttemptRepository,
  PrismaNotificationIntentRepository,
} from '../infrastructure/persistence/prisma/index.js';
import {
  NotificationDeliveryAttempt,
  NotificationIntent,
} from '../domain/entities/index.js';

describe('PrismaNotificationDeliveryAttemptRepository (integration)', () => {
  let prisma: PrismaService;
  let attemptRepo: PrismaNotificationDeliveryAttemptRepository;
  let intentRepo: PrismaNotificationIntentRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    attemptRepo = new PrismaNotificationDeliveryAttemptRepository(prisma);
    intentRepo = new PrismaNotificationIntentRepository(prisma);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  async function createIntent(workspaceId = '33333333-3333-4333-8333-333333333333') {
    const intent = NotificationIntent.createQueued({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: '22222222-2222-4222-8222-222222222222',
      workspaceId,
      channel: 'EMAIL',
      recipient: { email: 'user@example.com' },
      subject: 'Subject',
      body: 'Body',
      provider: 'NOOP',
      createdByPrincipalId: '44444444-4444-4444-8444-444444444444',
    });
    await intentRepo.save(intent);
    return intent;
  }

  it('persists delivery attempts and orders them by attempt number', async () => {
    const intent = await createIntent();

    await attemptRepo.save(
      NotificationDeliveryAttempt.createPending({
        id: '55555555-5555-4555-8555-555555555555',
        intentId: intent.id,
        provider: 'NOOP',
        attemptNumber: 2,
      }),
    );
    await attemptRepo.save(
      NotificationDeliveryAttempt.createPending({
        id: '66666666-6666-4666-8666-666666666666',
        intentId: intent.id,
        provider: 'NOOP',
        attemptNumber: 1,
      }),
    );

    const attempts = await attemptRepo.findByIntentId(intent.id);

    expect(attempts.map((attempt) => attempt.attemptNumber)).toEqual([1, 2]);
    expect(await attemptRepo.countByIntentId(intent.id)).toBe(2);
  });

  it('enforces unique attempt numbers per intent', async () => {
    const intent = await createIntent();
    const first = NotificationDeliveryAttempt.createPending({
      id: '55555555-5555-4555-8555-555555555555',
      intentId: intent.id,
      provider: 'NOOP',
      attemptNumber: 1,
    });

    await attemptRepo.save(first);

    await expect(
      attemptRepo.save(
        NotificationDeliveryAttempt.createPending({
          id: '66666666-6666-4666-8666-666666666666',
          intentId: intent.id,
          provider: 'NOOP',
          attemptNumber: 1,
        }),
      ),
    ).rejects.toMatchObject({
      type: 'UNIQUE_VIOLATION',
    });
  });
});
