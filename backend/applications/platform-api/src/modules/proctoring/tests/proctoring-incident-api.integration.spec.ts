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

describe.sequential('Proctoring Incident API (integration)', () => {
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
    ...creatorHeaders,
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
          operation({ transactionId: 'tx-proctoring-incident-api-test', client: tx }),
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

  async function setupAssessmentAttemptAndSession() {
    await prisma.principal.create({
      data: {
        id: learnerHeaders['x-actor-id'],
        email: 'learner@mentrily.com',
        displayName: 'Learner Test',
      },
    });

    await prisma.principal.create({
      data: {
        id: creatorHeaders['x-actor-id'],
        email: 'creator@mentrily.com',
        displayName: 'Creator Test',
      },
    });

    const assessment = await prisma.assessment.create({
      data: {
        tenantId: creatorHeaders['x-tenant-id'],
        workspaceId: creatorHeaders['x-workspace-id'],
        ownerPrincipalId: creatorHeaders['x-actor-id'],
        title: 'Proctoring Incident Test Assessment',
        purpose: 'QUIZ',
        status: 'PUBLISHED',
        visibility: 'WORKSPACE',
        resultReleasePolicy: 'IMMEDIATE',
        attemptPolicy: {},
        metadata: { proctoringMode: 'BASIC_EVENT_MONITORING' },
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
        metadata: { proctoringMode: 'BASIC_EVENT_MONITORING' },
      },
    });

    const session = await prisma.assessmentProctoringSession.create({
      data: {
        tenantId: learnerHeaders['x-tenant-id'],
        workspaceId: learnerHeaders['x-workspace-id'],
        id: 'c9999999-9999-4999-9999-999999999999',
        attemptId: attempt.id,
        assessmentId: assessment.id,
        learnerPrincipalId: learnerHeaders['x-actor-id'],
        status: 'ACTIVE',
        mode: 'BASIC_EVENT_MONITORING',
        startedAt: new Date(),
      },
    });

    return { assessment, attempt, session };
  }

  describe('Incident Automatic Grouping Policy', () => {
    it('creates an incident immediately when a high-severity event is ingested', async () => {
      const { session } = await setupAssessmentAttemptAndSession();

      const eventRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${session.id}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'FULLSCREEN_EXITED',
          severity: 'HIGH',
          occurredAt: new Date().toISOString(),
        },
      });
      expectHttpStatus(eventRes, 201);

      const incidents = await prisma.assessmentProctoringIncident.findMany({
        where: { sessionId: session.id },
      });
      expect(incidents.length).toBe(1);
      expect(incidents[0]!.incidentType).toBe('FULLSCREEN_EXIT');
      expect(incidents[0]!.severity).toBe('HIGH');
      expect(incidents[0]!.status).toBe('OPEN');
      expect(incidents[0]!.eventCount).toBe(1);
    });

    it('groups low/medium severity events into an incident only when warning threshold (>=3 events) is exceeded within 5 minutes', async () => {
      const { session } = await setupAssessmentAttemptAndSession();

      let eventRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${session.id}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'WINDOW_BLUR',
          severity: 'LOW',
          occurredAt: new Date().toISOString(),
        },
      });
      expectHttpStatus(eventRes, 201);

      let incidents = await prisma.assessmentProctoringIncident.findMany({
        where: { sessionId: session.id },
      });
      expect(incidents.length).toBe(0);

      eventRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${session.id}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'VISIBILITY_HIDDEN',
          severity: 'LOW',
          occurredAt: new Date(Date.now() + 5000).toISOString(),
        },
      });
      expectHttpStatus(eventRes, 201);

      incidents = await prisma.assessmentProctoringIncident.findMany({
        where: { sessionId: session.id },
      });
      expect(incidents.length).toBe(0);

      eventRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${session.id}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'WINDOW_BLUR',
          severity: 'LOW',
          occurredAt: new Date(Date.now() + 10000).toISOString(),
        },
      });
      expectHttpStatus(eventRes, 201);

      incidents = await prisma.assessmentProctoringIncident.findMany({
        where: { sessionId: session.id },
      });
      expect(incidents.length).toBe(1);
      expect(incidents[0]!.incidentType).toBe('FOCUS_LOSS');
      expect(incidents[0]!.eventCount).toBe(3);

      eventRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${session.id}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'WINDOW_BLUR',
          severity: 'HIGH',
          occurredAt: new Date(Date.now() + 15000).toISOString(),
        },
      });
      expectHttpStatus(eventRes, 201);

      const updatedIncident = await prisma.assessmentProctoringIncident.findUniqueOrThrow({
        where: { id: incidents[0]!.id },
      });
      expect(updatedIncident.eventCount).toBe(4);
      expect(updatedIncident.severity).toBe('HIGH');
    });
  });

  describe('Incident Triage APIs & Permissions', () => {
    let incidentId: string;
    let attemptId: string;
    let assessmentId: string;
    let sessionId: string;

    beforeEach(async () => {
      const { attempt, session } = await setupAssessmentAttemptAndSession();
      attemptId = attempt.id;
      assessmentId = attempt.assessmentId;
      sessionId = session.id;

      const eventRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/sessions/${session.id}/events`,
        headers: learnerHeaders,
        payload: {
          eventType: 'FULLSCREEN_EXITED',
          severity: 'HIGH',
          occurredAt: new Date().toISOString(),
        },
      });
      expectHttpStatus(eventRes, 201);

      const incident = await prisma.assessmentProctoringIncident.findFirstOrThrow({
        where: { sessionId: session.id },
      });
      incidentId = incident.id;

      allowedPermissions.add('assessment.monitor');
    });

    it('requires assessment.monitor or assessment.update permission for listing/details', async () => {
      allowedPermissions.clear();

      const listRes = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/incidents`,
        headers: creatorHeaders,
      });
      expectHttpStatus(listRes, 403);

      allowedPermissions.add('assessment.update');
      const listResOk = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/incidents`,
        headers: creatorHeaders,
      });
      expectHttpStatus(listResOk, 200);
      expect(listResOk.json().length).toBe(1);
    });

    it('returns workspace incident details and audit review action log', async () => {
      const detailRes = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/incidents/${incidentId}`,
        headers: creatorHeaders,
      });
      expectHttpStatus(detailRes, 200);
      const detail = detailRes.json();
      expect(detail.incident.id).toBe(incidentId);
      expect(detail.incident.learnerDisplayName).toBe('Learner Test');
      expect(detail.events.length).toBe(1);
      expect(detail.reviewActions.length).toBe(1);
      expect(detail.reviewActions[0].actionType).toBe('OPENED');
    });

    it('updates incident status and appends notes', async () => {
      const noteRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/incidents/${incidentId}/notes`,
        headers: creatorHeaders,
        payload: { note: 'Investigating copy-paste warnings.' },
      });
      expectHttpStatus(noteRes, 201);
      expect(noteRes.json().reviewActions.length).toBe(2);
      expect(noteRes.json().reviewActions[1].actionType).toBe('NOTE_ADDED');
      expect(noteRes.json().reviewActions[1].note).toBe('Investigating copy-paste warnings.');

      const statusRes1 = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/incidents/${incidentId}/status`,
        headers: creatorHeaders,
        payload: { status: 'IN_REVIEW', note: 'Moving to in-review status' },
      });
      expectHttpStatus(statusRes1, 201);
      expect(statusRes1.json().incident.status).toBe('IN_REVIEW');

      const statusRes2 = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/incidents/${incidentId}/status`,
        headers: creatorHeaders,
        payload: { status: 'RESOLVED', note: 'Reviewed. False alarm.' },
      });
      expectHttpStatus(statusRes2, 201);
      const resData = statusRes2.json();
      expect(resData.incident.status).toBe('RESOLVED');
      expect(resData.incident.resolvedAt).not.toBeNull();
      expect(resData.incident.resolution).toBe('Reviewed. False alarm.');
      expect(resData.incident.reviewedByDisplayName).toBe('Creator Test');
    });

    it('strictly isolates queries by workspace preventing cross-workspace leakage', async () => {
      const badRes = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/incidents/${incidentId}`,
        headers: otherWorkspaceHeaders,
      });
      expectHttpStatus(badRes, 404);
    });

    it('creates manual incidents by teachers/proctors', async () => {
      const manualRes = await app.inject({
        method: 'POST',
        url: `/workspace/proctoring/incidents/manual`,
        headers: creatorHeaders,
        payload: {
          sessionId,
          attemptId,
          assessmentId,
          learnerPrincipalId: learnerHeaders['x-actor-id'],
          incidentType: 'MANUAL_REVIEW_FLAG',
          severity: 'MEDIUM',
          title: 'Manual Teacher Flag',
          summary: 'Teacher observed suspicious visual movements.',
          note: 'Manually flagged during proctor shift',
        },
      });
      expectHttpStatus(manualRes, 201);
      const data = manualRes.json();
      expect(data.incident.title).toBe('Manual Teacher Flag');
      expect(data.incident.incidentType).toBe('MANUAL_REVIEW_FLAG');
      expect(data.incident.severity).toBe('MEDIUM');
      expect(data.reviewActions.length).toBe(1);
      expect(data.reviewActions[0].note).toBe('Manually flagged during proctor shift');
    });

    it('returns the correct incident summary counts for the workspace', async () => {
      const summaryRes = await app.inject({
        method: 'GET',
        url: `/workspace/proctoring/incidents/summary`,
        headers: creatorHeaders,
      });
      expectHttpStatus(summaryRes, 200);
      const summary = summaryRes.json();
      expect(summary.openCount).toBe(1);
      expect(summary.highSeverityCount).toBe(1);
      expect(summary.inReviewCount).toBe(0);
      expect(summary.resolvedDismissedCount).toBe(0);
      expect(summary.attemptsWithIncidentsCount).toBe(1);
    });
  });
});
