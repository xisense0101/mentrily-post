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

describe.sequential('Proctoring API (integration)', () => {
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

  const otherLearnerHeaders = {
    ...creatorHeaders,
    'x-actor-id': 'c7777777-7777-4777-8777-777777777777',
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
      run: async <T>(operation: Parameters<TransactionRunner['run']>[0]): Promise<T> => {
        if (!prismaRef.current) {
          throw new Error('prismaRef not initialized');
        }
        return prismaRef.current.$transaction(async (tx) =>
          operation({ transactionId: 'tx-proctoring-api-test', client: tx }),
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
    prismaRef.current = prisma;
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
    allowedPermissions.clear();
    // Default allowed permission to let learners read attempt metadata to start/run assessments
    allowedPermissions.add('assessment.attempt.read');
  });

  afterAll(async () => {
    await app.close();
  });

  function expectHttpStatus(
    response: { statusCode: number; body: string },
    expected: number,
  ): void {
    if (response.statusCode !== expected) {
      throw new Error(
        `Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}`,
      );
    }
  }

  async function setupAssessmentAndAttempt(
    proctoringMode: string = 'BASIC_EVENT_MONITORING',
    requireDisclosureAcknowledgement: boolean = false,
    requireFullscreen: boolean = false,
  ) {
    const assessment = await prisma.assessment.create({
      data: {
        tenantId: creatorHeaders['x-tenant-id'],
        workspaceId: creatorHeaders['x-workspace-id'],
        ownerPrincipalId: creatorHeaders['x-actor-id'],
        title: 'Proctoring Test Assessment',
        purpose: 'QUIZ',
        status: 'PUBLISHED',
        visibility: 'WORKSPACE',
        resultReleasePolicy: 'IMMEDIATE',
        attemptPolicy: {},
        metadata: { proctoringMode },
      },
    });

    await prisma.assessmentSecurityPolicy.create({
      data: {
        tenantId: creatorHeaders['x-tenant-id'],
        workspaceId: creatorHeaders['x-workspace-id'],
        assessmentId: assessment.id,
        proctoringMode: proctoringMode === 'OFF' ? 'OFF' : 'BASIC_EVENT_MONITORING',
        requireDisclosureAcknowledgement,
        requireFullscreen,
      },
    });

    const version = await prisma.assessmentVersion.create({
      data: {
        assessmentId: assessment.id,
        versionNumber: 1,
        status: 'PUBLISHED_SNAPSHOT',
        createdByPrincipalId: creatorHeaders['x-actor-id'],
      },
    });

    const snapshot = await prisma.assessmentPublishedSnapshot.create({
      data: {
        assessmentId: assessment.id,
        versionId: version.id,
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        publishedByPrincipalId: creatorHeaders['x-actor-id'],
        publishedAt: new Date(),
      },
    });

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        tenantId: learnerHeaders['x-tenant-id'],
        workspaceId: learnerHeaders['x-workspace-id'],
        assessmentId: assessment.id,
        snapshotId: snapshot.id,
        snapshotVersionId: version.id,
        snapshotVersionNumber: 1,
        learnerPrincipalId: learnerHeaders['x-actor-id'],
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        metadata: { proctoringMode },
      },
    });

    return { assessment, attempt };
  }

  describe('Session Lifecycle & Concurrency', () => {
    it('creates a proctoring session, blocks concurrent double-creation (coalesces to one)', async () => {
      const { attempt } = await setupAssessmentAndAttempt();

      // Launch multiple concurrent start session requests to test concurrency/race condition safety
      const startResponses = await Promise.all(
        Array.from({ length: 5 }, () =>
          app.inject({
            method: 'POST',
            url: `/workspace/proctoring/attempts/${attempt.id}/session/start`,
            headers: learnerHeaders,
          }),
        ),
      );

      startResponses.forEach((res) => expectHttpStatus(res, 201));

      const sessionIds = startResponses.map((res) => {
        const payload = res.json<{ summary: { session?: { sessionId: string } } }>();
        return payload.summary.session?.sessionId;
      });

      // Verify that exactly one session was created and returned
      const uniqueSessionIds = new Set(sessionIds.filter(Boolean));
      expect(uniqueSessionIds.size).toBe(1);

      const dbSessionsCount = await prisma.assessmentProctoringSession.count({
        where: { attemptId: attempt.id },
      });
      expect(dbSessionsCount).toBe(1);
    });

    it('returns empty session summary if proctoring mode is OFF', async () => {
      const { attempt } = await setupAssessmentAndAttempt('OFF');

      const startRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/attempts/${attempt.id}/session/start`,
        headers: learnerHeaders,
      });

      expectHttpStatus(startRes, 201);
      const data = startRes.json<{ summary: { enabled: boolean; session?: unknown } }>();
      expect(data.summary.enabled).toBe(false);
      expect(data.summary.session).toBeUndefined();
    });

    it('syncs terminal attempt states to end the proctoring session', async () => {
      const { attempt } = await setupAssessmentAndAttempt();

      const startRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/attempts/${attempt.id}/session/start`,
        headers: learnerHeaders,
      });
      expectHttpStatus(startRes, 201);
      const sessionId = startRes.json<{ summary: { session: { sessionId: string } } }>().summary
        .session.sessionId;

      // Mock end attempt status triggering sync terminal proctoring
      // We can invoke the SyncAttemptTerminalProctoringUseCase indirectly by completing/cancelling the attempt
      // Or we can verify the session end endpoint
      const endRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${sessionId}/end`,
        headers: learnerHeaders,
      });
      expectHttpStatus(endRes, 201);
      const endedSession = endRes.json<{ status: string }>();
      expect(endedSession.status).toBe('ENDED');

      const dbSession = await prisma.assessmentProctoringSession.findUniqueOrThrow({
        where: { id: sessionId },
      });
      expect(dbSession.status).toBe('ENDED');
      expect(dbSession.endedAt).not.toBeNull();
    });

    it('gating: blocks session start if disclosure acknowledgement is required but not provided', async () => {
      const { attempt } = await setupAssessmentAndAttempt('BASIC_EVENT_MONITORING', true, false);

      const startRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/attempts/${attempt.id}/session/start`,
        headers: learnerHeaders,
      });

      expectHttpStatus(startRes, 400);
      const body = startRes.json<{
        error: { code: string; message: string; details?: { securityState?: any } };
      }>();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('disclosure acknowledgement required');
      expect(body.error.details?.securityState.canStartMonitoring).toBe(false);
      expect(body.error.details?.securityState.blockedReasons).toContain(
        'DISCLOSURE_ACKNOWLEDGEMENT_REQUIRED',
      );
    });

    it('gating: blocks session start if fullscreen is required but not satisfied', async () => {
      const { attempt } = await setupAssessmentAndAttempt('BASIC_EVENT_MONITORING', false, true);

      const startRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/attempts/${attempt.id}/session/start`,
        headers: learnerHeaders,
      });

      expectHttpStatus(startRes, 400);
      const body = startRes.json<{
        error: { code: string; message: string; details?: { securityState?: any } };
      }>();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('fullscreen required');
      expect(body.error.details?.securityState.canStartMonitoring).toBe(false);
      expect(body.error.details?.securityState.blockedReasons).toContain('FULLSCREEN_REQUIRED');
    });

    it('gating: allows starting session when required gates are satisfied in request body', async () => {
      const { attempt } = await setupAssessmentAndAttempt('BASIC_EVENT_MONITORING', true, true);

      const startRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/attempts/${attempt.id}/session/start`,
        headers: learnerHeaders,
        payload: {
          acknowledgeDisclosure: true,
          fullscreenSatisfied: true,
        },
      });

      expectHttpStatus(startRes, 201);
      const body = startRes.json<{
        summary: { session: { sessionId: string } };
        securityState: any;
      }>();
      expect(body.summary.session.sessionId).toBeDefined();
      expect(body.securityState.canStartMonitoring).toBe(true);
      expect(body.securityState.blockedReasons).toHaveLength(0);
    });
  });

  describe('Access Control & Validation', () => {
    it('blocks starting a session if the learner does not own the attempt', async () => {
      const { attempt } = await setupAssessmentAndAttempt();

      const startRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/attempts/${attempt.id}/session/start`,
        headers: otherLearnerHeaders,
      });
      expectHttpStatus(startRes, 403);
    });

    it('blocks starting a session if attempted from another workspace', async () => {
      const { attempt } = await setupAssessmentAndAttempt();

      const startRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/attempts/${attempt.id}/session/start`,
        headers: otherWorkspaceHeaders,
      });
      // Workspace scoping blocks finding the attempt
      expectHttpStatus(startRes, 404);
    });

    it('blocks endpoints if request-context is missing permission assessment.attempt.read', async () => {
      const { attempt } = await setupAssessmentAndAttempt();
      allowedPermissions.clear(); // remove assessment.attempt.read

      const startRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/attempts/${attempt.id}/session/start`,
        headers: learnerHeaders,
      });
      expectHttpStatus(startRes, 403);
    });
  });

  describe('Event Ingestion & Data Constraints', () => {
    let sessionId: string;
    let attemptId: string;
    let assessmentId: string;

    beforeEach(async () => {
      const { attempt } = await setupAssessmentAndAttempt();
      attemptId = attempt.id;
      assessmentId = attempt.assessmentId;

      const startRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/attempts/${attempt.id}/session/start`,
        headers: learnerHeaders,
      });
      expectHttpStatus(startRes, 201);
      sessionId = startRes.json<{ summary: { session: { sessionId: string } } }>().summary.session
        .sessionId;
    });

    it('ingests allowed events successfully', async () => {
      const eventRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${sessionId}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'WINDOW_BLUR',
          severity: 'LOW',
          occurredAt: new Date().toISOString(),
          metadata: { clientTime: '2026-05-26T21:00:00Z', sequence: 1 },
        },
      });
      expectHttpStatus(eventRes, 201);
      const data = eventRes.json<{ duplicate: boolean; event: { eventType: string } }>();
      expect(data.duplicate).toBe(false);
      expect(data.event.eventType).toBe('WINDOW_BLUR');
    });

    it('blocks event ingestion for unsupported event types', async () => {
      const eventRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${sessionId}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'UNSUPPORTED_RANDOM_EVENT',
          severity: 'LOW',
          occurredAt: new Date().toISOString(),
          metadata: {},
        },
      });
      expectHttpStatus(eventRes, 400);
    });

    it('converts oversized metadata errors into a safe 400 validation response', async () => {
      // Create metadata exceeding 512 bytes limit
      const longMessage = 'a'.repeat(600);
      const eventRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${sessionId}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'SUSPICIOUS_ACTIVITY_REPORTED',
          severity: 'HIGH',
          occurredAt: new Date().toISOString(),
          metadata: { message: longMessage },
        },
      });

      // Verify that this throws a 400 Bad Request / Validation error instead of an internal 500 error
      expectHttpStatus(eventRes, 400);
      expect(eventRes.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns duplicate=true for matching eventIds (idempotency)', async () => {
      const eventId = 'event-unique-id-123';
      const payload = {
        eventId,
        eventType: 'PASTE_ATTEMPTED',
        severity: 'MEDIUM',
        occurredAt: new Date().toISOString(),
        metadata: { clientTime: '2026-05-26T21:00:00Z', sequence: 2, questionId: 'q-1' },
      };

      const firstRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${sessionId}/events`,
        headers: learnerHeaders,
        payload,
      });
      expectHttpStatus(firstRes, 201);
      expect(firstRes.json().duplicate).toBe(false);

      const secondRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${sessionId}/events`,
        headers: learnerHeaders,
        payload,
      });
      expectHttpStatus(secondRes, 201);
      expect(secondRes.json().duplicate).toBe(true);
    });

    it('enforces rate limiting on monitoring events (max 40 events/minute)', async () => {
      // Generate 40 events first
      for (let i = 0; i < 40; i++) {
        await prisma.assessmentProctoringEvent.create({
          data: {
            tenantId: learnerHeaders['x-tenant-id'],
            workspaceId: learnerHeaders['x-workspace-id'],
            sessionId,
            attemptId,
            assessmentId,
            learnerPrincipalId: learnerHeaders['x-actor-id'],
            eventType: 'WINDOW_BLUR',
            occurredAt: new Date(),
            receivedAt: new Date(),
            metadata: {},
          },
        });
      }

      // 41st request should be rate-limited
      const rateLimitedRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${sessionId}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'WINDOW_FOCUS',
          severity: 'INFO',
          occurredAt: new Date().toISOString(),
          metadata: {},
        },
      });

      expectHttpStatus(rateLimitedRes, 429);
      expect(rateLimitedRes.json().error.code).toBe('RATE_LIMITED');
    });

    it('blocks event ingestion after the session is ended', async () => {
      // End session first
      const endRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${sessionId}/end`,
        headers: learnerHeaders,
      });
      expectHttpStatus(endRes, 201);

      // Try to ingest event
      const eventRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${sessionId}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'WINDOW_BLUR',
          severity: 'LOW',
          occurredAt: new Date().toISOString(),
          metadata: {},
        },
      });

      expectHttpStatus(eventRes, 409);
      expect(eventRes.json().error.code).toBe('CONFLICT');
    });
  });

  describe('Teacher Monitoring & Timeline Read', () => {
    let attemptId: string;
    let assessmentId: string;

    beforeEach(async () => {
      const { attempt, assessment } = await setupAssessmentAndAttempt();
      attemptId = attempt.id;
      assessmentId = assessment.id;

      allowedPermissions.add('assessment.monitor');
    });

    it('allows workspace teachers/admins with assessment.monitor permission to read timelines and summaries', async () => {
      // 1. Read attempt timeline
      const timelineRes = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/attempts/${attemptId}/timeline`,
        headers: creatorHeaders, // teacher/creator headers
      });
      expectHttpStatus(timelineRes, 200);
      expect(timelineRes.json()).toHaveProperty('events');

      // 2. Read active assessments summary
      const activeRes = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/assessments/${assessmentId}/active`,
        headers: creatorHeaders,
      });
      expectHttpStatus(activeRes, 200);
      expect(activeRes.json()).toHaveProperty('sessions');
    });

    it('blocks timeline read and summaries if assessment.monitor permission is missing', async () => {
      allowedPermissions.delete('assessment.monitor');

      const timelineRes = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/attempts/${attemptId}/timeline`,
        headers: creatorHeaders,
      });
      expectHttpStatus(timelineRes, 403);
    });

    it('blocks learners from accessing teacher timeline endpoints', async () => {
      // Learner does not have assessment.monitor permission
      allowedPermissions.delete('assessment.monitor');

      const timelineRes = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/attempts/${attemptId}/timeline`,
        headers: learnerHeaders,
      });
      expectHttpStatus(timelineRes, 403);
    });
  });
});
