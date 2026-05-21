import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { PrismaNotificationIntentRepository } from '../infrastructure/persistence/prisma/index.js';
import { NotificationIntent } from '../domain/entities/index.js';

describe('PrismaNotificationIntentRepository (integration)', () => {
  let prisma: PrismaService;
  let repo: PrismaNotificationIntentRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repo = new PrismaNotificationIntentRepository(prisma);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  it('saves and loads intent', async () => {
    const intent = NotificationIntent.createQueued({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '33333333-3333-4333-8333-333333333333',
      channel: 'EMAIL',
      recipient: { email: 'user@example.com' },
      subject: 'Subject',
      body: 'Body',
      provider: 'NOOP',
      createdByPrincipalId: '44444444-4444-4444-8444-444444444444',
    });
    await repo.save(intent);
    expect((await repo.findById(intent.id))?.id).toBe(intent.id);
  });
});
