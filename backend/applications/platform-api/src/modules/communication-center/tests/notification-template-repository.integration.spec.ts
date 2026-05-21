import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { PrismaNotificationTemplateRepository } from '../infrastructure/persistence/prisma/index.js';
import { NotificationTemplate } from '../domain/entities/index.js';

describe('PrismaNotificationTemplateRepository (integration)', () => {
  let prisma: PrismaService;
  let repo: PrismaNotificationTemplateRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repo = new PrismaNotificationTemplateRepository(prisma);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  it('saves and loads template', async () => {
    const template = NotificationTemplate.createDraft({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '33333333-3333-4333-8333-333333333333',
      key: 'welcome_email',
      name: 'Welcome Email',
      channel: 'EMAIL',
      subjectTemplate: 'Hi {{name}}',
      bodyTemplate: 'Welcome {{name}}',
      variables: ['name'],
      createdByPrincipalId: '44444444-4444-4444-8444-444444444444',
    });
    await repo.save(template);
    expect((await repo.findById(template.id))?.id).toBe(template.id);
  });
});
