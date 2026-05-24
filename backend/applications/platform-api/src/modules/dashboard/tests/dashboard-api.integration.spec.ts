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
import { registerCorrelationIdHook } from '../../../foundation/correlation-id.hook.js';
import { AppModule } from '../../app.module.js';

describe('Dashboard API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const tenantId = '63333333-3333-4333-8333-333333333333';
  const workspaceId = '74444444-4444-4444-8444-444444444444';
  const actorId = '85555555-5555-4555-8555-555555555555';

  const headers = {
    'x-request-id': '91111111-1111-4111-8111-111111111111',
    'x-correlation-id': '92222222-2222-4222-8222-222222222222',
    'x-tenant-id': tenantId,
    'x-workspace-id': workspaceId,
    'x-actor-id': actorId,
  } as const;

  beforeAll(async () => {
    let prismaRef: PrismaService | undefined;
    const permissionEvaluator: PermissionEvaluator = { evaluate: async () => ({ allowed: true }) };
    const transactionRunner: TransactionRunner = {
      run: async <T>(operation: Parameters<TransactionRunner['run']>[0]): Promise<T> => {
        if (!prismaRef) {
          throw new Error('prismaRef not initialized');
        }
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

    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: 'Dashboard Workspace',
        slug: 'dashboard-workspace',
        status: 'ACTIVE',
      },
    });

    await prisma.principal.create({
      data: {
        id: actorId,
        email: 'dashboard@example.com',
        displayName: 'Dashboard Admin',
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

  it('returns a safe zero summary for an empty workspace', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/workspace/dashboard',
      headers,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      summary: {
        workspaceId,
        totalCourses: 0,
        totalPublishedCourses: 0,
        totalAssessments: 0,
        totalActiveAssessments: 0,
        pendingGradingCount: 0,
        contentDocumentsCount: 0,
        mediaAssetsCount: 0,
        failedQuarantinedMediaCount: 0,
        campaignsCount: 0,
      },
      recentActivity: [],
    });
  });
});
