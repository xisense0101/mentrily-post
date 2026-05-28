import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  PERMISSION_EVALUATOR,
  TRANSACTION_RUNNER,
  type PermissionEvaluator,
  type TransactionRunner,
} from '@mentrily/service-core';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { AppModule } from '../../app.module.js';
import { registerCorrelationIdHook } from '../../../foundation/correlation-id.hook.js';

describe.sequential('Assessment Security Policy Use Cases (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const allowedPermissions = new Set<string>();

  const creatorHeaders = {
    'x-request-id': 'c1111111-1111-4111-8111-111111111111',
    'x-correlation-id': 'c2222222-2222-4222-8222-222222222222',
    'x-tenant-id': 'c3333333-3333-4333-8333-333333333333',
    'x-workspace-id': 'c4444444-4444-4444-8444-444444444444',
    'x-actor-id': 'c5555555-5555-4555-8555-555555555555',
  } as const;

  const learnerHeaders = {
    ...creatorHeaders,
    'x-actor-id': 'c6666666-6666-4666-8666-666666666666',
  } as const;

  const otherWorkspaceHeaders = {
    ...learnerHeaders,
    'x-workspace-id': 'c8888888-8888-4888-8888-888888888888',
  } as const;

  beforeAll(async () => {
    const prismaRef: { current: PrismaService | undefined } = { current: undefined };
    const permissionEvaluator: PermissionEvaluator = {
      evaluate: async (req) => ({
        allowed: allowedPermissions.has(req.permission),
      }),
    };

    const transactionRunner: TransactionRunner = {
      run: async (fn: any) => await fn(undefined),
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
    prismaRef.current = prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    allowedPermissions.clear();
    await truncatePublicSchema(prisma);
  });

  describe('GET /workspace/proctoring/assessments/:assessmentId/security-policy', () => {
    it('returns default OFF policy when no row exists', async () => {
      allowedPermissions.add('assessment.read');
      const assessment = await prisma.assessment.create({
        data: {
          id: 'a1111111-1111-4111-8111-111111111111',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          ownerPrincipalId: creatorHeaders['x-actor-id'],
          purpose: 'QUIZ',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          title: 'Test Assessment',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/assessments/${assessment.id}/security-policy`,
        headers: creatorHeaders,
      });

      expect([200, 201]).toContain(response.statusCode);
      const data = JSON.parse(response.body);
      expect(data.proctoringMode).toBe('OFF');
      expect(data.requireDisclosureAcknowledgement).toBe(true);
      expect(data.heartbeatIntervalSeconds).toBe(30);
      expect(data.incidentThresholdFocusLossCount).toBe(3);
    });

    it('returns persisted policy when row exists', async () => {
      allowedPermissions.add('assessment.read');
      const assessment = await prisma.assessment.create({
        data: {
          id: 'a2222222-2222-4222-8222-222222222222',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          ownerPrincipalId: creatorHeaders['x-actor-id'],
          purpose: 'QUIZ',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          title: 'Test Assessment',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
        },
      });

      await prisma.assessmentSecurityPolicy.create({
        data: {
          id: '11111111-1111-4111-8111-111111111111',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          assessmentId: assessment.id,
          proctoringMode: 'BASIC_EVENT_MONITORING',
          requireDisclosureAcknowledgement: false,
          requireFullscreen: true,
          trackFocusChanges: false,
          trackVisibilityChanges: true,
          trackFullscreenChanges: true,
          trackCopyPasteAttempts: true,
          trackNetworkStatus: false,
          heartbeatIntervalSeconds: 60,
          incidentThresholdFocusLossCount: 5,
          incidentThresholdFocusLossWindowSeconds: 300,
          incidentThresholdVisibilityHiddenCount: 2,
          incidentThresholdVisibilityHiddenWindowSeconds: 180,
          incidentThresholdNetworkOfflineCount: 1,
          incidentThresholdNetworkOfflineWindowSeconds: 120,
          disclosureTitle: 'Custom Title',
          disclosureBody: 'Custom Body',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/assessments/${assessment.id}/security-policy`,
        headers: creatorHeaders,
      });

      expect([200, 201]).toContain(response.statusCode);
      const data = JSON.parse(response.body);
      expect(data.proctoringMode).toBe('BASIC_EVENT_MONITORING');
      expect(data.requireDisclosureAcknowledgement).toBe(false);
      expect(data.requireFullscreen).toBe(true);
      expect(data.trackFocusChanges).toBe(false);
      expect(data.trackNetworkStatus).toBe(false);
      expect(data.heartbeatIntervalSeconds).toBe(60);
      expect(data.incidentThresholdFocusLossCount).toBe(5);
      expect(data.disclosureTitle).toBe('Custom Title');
      expect(data.disclosureBody).toBe('Custom Body');
    });

    it('blocks cross-workspace read', async () => {
      allowedPermissions.add('assessment.read');
      const assessment = await prisma.assessment.create({
        data: {
          id: 'a3333333-3333-4333-8333-333333333333',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          ownerPrincipalId: creatorHeaders['x-actor-id'],
          purpose: 'QUIZ',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          title: 'Test Assessment',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/assessments/${assessment.id}/security-policy`,
        headers: otherWorkspaceHeaders,
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 404 for non-existent assessment', async () => {
      allowedPermissions.add('assessment.read');

      const response = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/assessments/00000000-0000-4000-8000-000000000000/security-policy`,
        headers: creatorHeaders,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /workspace/proctoring/assessments/:assessmentId/security-policy', () => {
    it('creator can update policy', async () => {
      allowedPermissions.add('assessment.update');
      const assessment = await prisma.assessment.create({
        data: {
          id: 'a4444444-4444-4444-8444-444444444444',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          ownerPrincipalId: creatorHeaders['x-actor-id'],
          purpose: 'QUIZ',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          title: 'Test Assessment',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/assessments/${assessment.id}/security-policy`,
        headers: creatorHeaders,
        payload: {
          proctoringMode: 'BASIC_EVENT_MONITORING',
          requireDisclosureAcknowledgement: true,
          requireFullscreen: false,
          trackFocusChanges: true,
          trackVisibilityChanges: true,
          trackFullscreenChanges: true,
          trackCopyPasteAttempts: true,
          trackNetworkStatus: true,
          heartbeatIntervalSeconds: 30,
          incidentThresholdFocusLossCount: 3,
          incidentThresholdFocusLossWindowSeconds: 600,
          incidentThresholdVisibilityHiddenCount: 3,
          incidentThresholdVisibilityHiddenWindowSeconds: 600,
          incidentThresholdNetworkOfflineCount: 3,
          incidentThresholdNetworkOfflineWindowSeconds: 600,
        },
      });

      expect([200, 201]).toContain(response.statusCode);
      const data = JSON.parse(response.body);
      expect(data.proctoringMode).toBe('BASIC_EVENT_MONITORING');
    });

    it('rejects invalid proctoring mode', async () => {
      allowedPermissions.add('assessment.update');
      const assessment = await prisma.assessment.create({
        data: {
          id: 'a5555555-5555-4555-8555-555555555555',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          ownerPrincipalId: creatorHeaders['x-actor-id'],
          purpose: 'QUIZ',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          title: 'Test Assessment',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/assessments/${assessment.id}/security-policy`,
        headers: creatorHeaders,
        payload: {
          proctoringMode: 'INVALID_MODE' as any,
          requireDisclosureAcknowledgement: true,
          requireFullscreen: false,
          trackFocusChanges: true,
          trackVisibilityChanges: true,
          trackFullscreenChanges: true,
          trackCopyPasteAttempts: true,
          trackNetworkStatus: true,
          heartbeatIntervalSeconds: 30,
          incidentThresholdFocusLossCount: 3,
          incidentThresholdFocusLossWindowSeconds: 600,
          incidentThresholdVisibilityHiddenCount: 3,
          incidentThresholdVisibilityHiddenWindowSeconds: 600,
          incidentThresholdNetworkOfflineCount: 3,
          incidentThresholdNetworkOfflineWindowSeconds: 600,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects out-of-bounds threshold', async () => {
      allowedPermissions.add('assessment.update');
      const assessment = await prisma.assessment.create({
        data: {
          id: 'a6666666-6666-4666-8666-666666666666',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          ownerPrincipalId: creatorHeaders['x-actor-id'],
          purpose: 'QUIZ',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          title: 'Test Assessment',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/assessments/${assessment.id}/security-policy`,
        headers: creatorHeaders,
        payload: {
          proctoringMode: 'BASIC_EVENT_MONITORING',
          requireDisclosureAcknowledgement: true,
          requireFullscreen: false,
          trackFocusChanges: true,
          trackVisibilityChanges: true,
          trackFullscreenChanges: true,
          trackCopyPasteAttempts: true,
          trackNetworkStatus: true,
          heartbeatIntervalSeconds: 30,
          incidentThresholdFocusLossCount: 100, // Out of bounds (max: 10)
          incidentThresholdFocusLossWindowSeconds: 600,
          incidentThresholdVisibilityHiddenCount: 3,
          incidentThresholdVisibilityHiddenWindowSeconds: 600,
          incidentThresholdNetworkOfflineCount: 3,
          incidentThresholdNetworkOfflineWindowSeconds: 600,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('blocks cross-workspace update', async () => {
      allowedPermissions.add('assessment.update');
      const assessment = await prisma.assessment.create({
        data: {
          id: 'a7777777-7777-4777-8777-777777777777',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          ownerPrincipalId: creatorHeaders['x-actor-id'],
          purpose: 'QUIZ',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          title: 'Test Assessment',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/assessments/${assessment.id}/security-policy`,
        headers: otherWorkspaceHeaders,
        payload: {
          proctoringMode: 'BASIC_EVENT_MONITORING',
          requireDisclosureAcknowledgement: true,
          requireFullscreen: false,
          trackFocusChanges: true,
          trackVisibilityChanges: true,
          trackFullscreenChanges: true,
          trackCopyPasteAttempts: true,
          trackNetworkStatus: true,
          heartbeatIntervalSeconds: 30,
          incidentThresholdFocusLossCount: 3,
          incidentThresholdFocusLossWindowSeconds: 600,
          incidentThresholdVisibilityHiddenCount: 3,
          incidentThresholdVisibilityHiddenWindowSeconds: 600,
          incidentThresholdNetworkOfflineCount: 3,
          incidentThresholdNetworkOfflineWindowSeconds: 600,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('blocks learner policy update', async () => {
      allowedPermissions.add('assessment.read'); // Learner permission only, not update
      const assessment = await prisma.assessment.create({
        data: {
          id: 'a8888888-8888-4888-8888-888888888888',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          ownerPrincipalId: creatorHeaders['x-actor-id'],
          purpose: 'QUIZ',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          title: 'Test Assessment',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/assessments/${assessment.id}/security-policy`,
        headers: learnerHeaders,
        payload: {
          proctoringMode: 'BASIC_EVENT_MONITORING',
          requireDisclosureAcknowledgement: true,
          requireFullscreen: false,
          trackFocusChanges: true,
          trackVisibilityChanges: true,
          trackFullscreenChanges: true,
          trackCopyPasteAttempts: true,
          trackNetworkStatus: true,
          heartbeatIntervalSeconds: 30,
          incidentThresholdFocusLossCount: 3,
          incidentThresholdFocusLossWindowSeconds: 600,
          incidentThresholdVisibilityHiddenCount: 3,
          incidentThresholdVisibilityHiddenWindowSeconds: 600,
          incidentThresholdNetworkOfflineCount: 3,
          incidentThresholdNetworkOfflineWindowSeconds: 600,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('does not expose tenantId/workspaceId from request body', async () => {
      allowedPermissions.add('assessment.update');
      const assessment = await prisma.assessment.create({
        data: {
          id: 'a9999999-9999-4999-8999-999999999999',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          ownerPrincipalId: creatorHeaders['x-actor-id'],
          purpose: 'QUIZ',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          title: 'Test Assessment',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
        },
      });

      // Attempt to override workspace via request body - should be ignored
      const response = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/assessments/${assessment.id}/security-policy`,
        headers: creatorHeaders,
        payload: {
          proctoringMode: 'BASIC_EVENT_MONITORING',
          requireDisclosureAcknowledgement: true,
          requireFullscreen: false,
          trackFocusChanges: true,
          trackVisibilityChanges: true,
          trackFullscreenChanges: true,
          trackCopyPasteAttempts: true,
          trackNetworkStatus: true,
          heartbeatIntervalSeconds: 30,
          incidentThresholdFocusLossCount: 3,
          incidentThresholdFocusLossWindowSeconds: 600,
          incidentThresholdVisibilityHiddenCount: 3,
          incidentThresholdVisibilityHiddenWindowSeconds: 600,
          incidentThresholdNetworkOfflineCount: 3,
          incidentThresholdNetworkOfflineWindowSeconds: 600,
          tenantId: 'fake-tenant', // Try to override
          workspaceId: 'fake-workspace', // Try to override
        } as any,
      });

      expect([200, 201]).toContain(response.statusCode);
      const savedPolicy = await prisma.assessmentSecurityPolicy.findUnique({
        where: { assessmentId: assessment.id },
      });

      // Verify the policy was saved with the correct workspace
      expect(savedPolicy?.workspaceId).toBe(creatorHeaders['x-workspace-id']);
      expect(savedPolicy?.tenantId).toBe(creatorHeaders['x-tenant-id']);
    });

    it('allows RESERVED_LIVE_MONITORING mode (for future use)', async () => {
      allowedPermissions.add('assessment.update');
      const assessment = await prisma.assessment.create({
        data: {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          tenantId: creatorHeaders['x-tenant-id'],
          workspaceId: creatorHeaders['x-workspace-id'],
          ownerPrincipalId: creatorHeaders['x-actor-id'],
          purpose: 'QUIZ',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          title: 'Test Assessment',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/assessments/${assessment.id}/security-policy`,
        headers: creatorHeaders,
        payload: {
          proctoringMode: 'RESERVED_LIVE_MONITORING',
          requireDisclosureAcknowledgement: true,
          requireFullscreen: false,
          trackFocusChanges: true,
          trackVisibilityChanges: true,
          trackFullscreenChanges: true,
          trackCopyPasteAttempts: true,
          trackNetworkStatus: true,
          heartbeatIntervalSeconds: 30,
          incidentThresholdFocusLossCount: 3,
          incidentThresholdFocusLossWindowSeconds: 600,
          incidentThresholdVisibilityHiddenCount: 3,
          incidentThresholdVisibilityHiddenWindowSeconds: 600,
          incidentThresholdNetworkOfflineCount: 3,
          incidentThresholdNetworkOfflineWindowSeconds: 600,
        },
      });

      expect([200, 201]).toContain(response.statusCode);
      const data = JSON.parse(response.body);
      expect(data.proctoringMode).toBe('RESERVED_LIVE_MONITORING');
    });
  });
});
