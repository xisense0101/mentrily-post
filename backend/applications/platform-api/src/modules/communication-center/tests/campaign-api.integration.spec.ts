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

describe('Campaign Management API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const tenantId = '33333333-3333-4333-8333-333333333333';
  const workspaceId = '44444444-4444-4444-8444-444444444444';
  const actorId = '55555555-5555-4555-8555-555555555555';

  const headers = {
    'x-request-id': '11111111-1111-4111-8111-111111111111',
    'x-correlation-id': '22222222-2222-4222-8222-222222222222',
    'x-tenant-id': tenantId,
    'x-workspace-id': workspaceId,
    'x-actor-id': actorId,
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

    // Setup base workspace, owner principal and membership
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: 'Test Workspace',
        slug: 'test-workspace',
        status: 'ACTIVE',
      },
    });

    await prisma.principal.create({
      data: {
        id: actorId,
        email: 'owner@example.com',
        displayName: 'Workspace Owner',
        status: 'ACTIVE',
      },
    });

    await prisma.workspaceMember.create({
      data: {
        id: randomUUID(),
        workspaceId,
        principalId: actorId,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('performs full campaign draft lifecycle', async () => {
    // 1. Create campaign
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/campaigns',
      headers,
      payload: {
        name: 'Summer Outreach',
        description: 'Notify active members about summer events',
        channel: 'EMAIL',
        subject: 'Welcome to Summer!',
        body: 'Hello {{name}}',
        audienceType: 'ALL_WORKSPACE_MEMBERS',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const campaign = createRes.json();
    expect(campaign.id).toBeDefined();
    expect(campaign.status).toBe('DRAFT');

    // 2. Get campaign
    const getRes = await app.inject({
      method: 'GET',
      url: `/workspace/campaigns/${campaign.id}`,
      headers,
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().name).toBe('Summer Outreach');

    // 3. Update campaign
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/workspace/campaigns/${campaign.id}`,
      headers,
      payload: {
        name: 'Summer Outreach Updated',
        subject: 'Updated Summer Subject!',
      },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().name).toBe('Summer Outreach Updated');
    expect(updateRes.json().subject).toBe('Updated Summer Subject!');

    // 4. List campaigns
    const listRes = await app.inject({
      method: 'GET',
      url: '/workspace/campaigns',
      headers,
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json()).toHaveLength(1);

    // 5. Schedule campaign (valid future date)
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduleRes = await app.inject({
      method: 'POST',
      url: `/workspace/campaigns/${campaign.id}/schedule`,
      headers,
      payload: {
        scheduledFor: futureDate,
      },
    });
    expect(scheduleRes.statusCode).toBe(201);
    expect(scheduleRes.json().status).toBe('SCHEDULED');
    expect(scheduleRes.json().scheduledFor).toBe(futureDate);

    // 6. Archive (delete) campaign
    const archiveRes = await app.inject({
      method: 'DELETE',
      url: `/workspace/campaigns/${campaign.id}/archive`,
      headers,
    });
    expect(archiveRes.statusCode).toBe(200);
    expect(archiveRes.json().status).toBe('ARCHIVED');
    expect(archiveRes.json().archivedAt).toBeDefined();

    // 7. Verify updates are rejected on archived campaign
    const badUpdateRes = await app.inject({
      method: 'PATCH',
      url: `/workspace/campaigns/${campaign.id}`,
      headers,
      payload: { name: 'Cannot change archived' },
    });
    expect(badUpdateRes.statusCode).toBe(400);
  });

  it('previews audience and message', async () => {
    // Add another workspace member as learner
    const learnerId = randomUUID();
    await prisma.principal.create({
      data: {
        id: learnerId,
        email: 'learner@example.com',
        displayName: 'Learner One',
        status: 'ACTIVE',
      },
    });
    await prisma.workspaceMember.create({
      data: {
        id: randomUUID(),
        workspaceId,
        principalId: learnerId,
        status: 'ACTIVE',
      },
    });

    // Preview audience
    const previewAudienceRes = await app.inject({
      method: 'POST',
      url: '/workspace/campaigns/audience/preview',
      headers,
      payload: {
        audienceType: 'ALL_WORKSPACE_MEMBERS',
      },
    });
    expect(previewAudienceRes.statusCode).toBe(201);
    const audience = previewAudienceRes.json();
    expect(audience.totalCount).toBe(2);
    expect(audience.recipients).toHaveLength(2);

    // Preview message
    const previewMsgRes = await app.inject({
      method: 'POST',
      url: '/workspace/campaigns/message/preview',
      headers,
      payload: {
        subject: 'Hey {{name}}',
        body: 'Glad you joined us at {{event}}!',
        variables: {
          name: 'Charlie',
          event: 'Tech Talk',
        },
      },
    });
    expect(previewMsgRes.statusCode).toBe(201);
    expect(previewMsgRes.json().subject).toBe('Hey Charlie');
    expect(previewMsgRes.json().body).toBe('Glad you joined us at Tech Talk!');
  });
});
