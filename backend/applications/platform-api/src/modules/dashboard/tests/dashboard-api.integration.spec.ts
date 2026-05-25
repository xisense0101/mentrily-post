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
  let allowDashboardRead = true;

  const tenantId = '63333333-3333-4333-8333-333333333333';
  const workspaceId = '74444444-4444-4444-8444-444444444444';
  const otherWorkspaceId = '74444444-4444-4444-8444-444444444445';
  const actorId = '85555555-5555-4555-8555-555555555555';
  const learnerId = '85555555-5555-4555-8555-555555555556';

  const headers = {
    'x-request-id': '91111111-1111-4111-8111-111111111111',
    'x-correlation-id': '92222222-2222-4222-8222-222222222222',
    'x-tenant-id': tenantId,
    'x-workspace-id': workspaceId,
    'x-actor-id': actorId,
  } as const;

  beforeAll(async () => {
    let prismaRef: PrismaService | undefined;
    const permissionEvaluator: PermissionEvaluator = {
      evaluate: async () => ({ allowed: allowDashboardRead }),
    };
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
    allowDashboardRead = true;
    await truncatePublicSchema(prisma);

    await prisma.workspace.createMany({
      data: [
        {
          id: workspaceId,
          name: 'Dashboard Workspace',
          slug: 'dashboard-workspace',
          status: 'ACTIVE',
        },
        {
          id: otherWorkspaceId,
          name: 'Other Workspace',
          slug: 'other-workspace',
          status: 'ACTIVE',
        },
      ],
    });

    await prisma.principal.createMany({
      data: [
        {
          id: actorId,
          email: 'dashboard@example.com',
          displayName: 'Dashboard Admin',
          status: 'ACTIVE',
        },
        {
          id: learnerId,
          email: 'learner@example.com',
          displayName: 'Learner',
          status: 'ACTIVE',
        },
      ],
    });

    await prisma.workspaceMember.createMany({
      data: [
        {
          id: randomUUID(),
          workspaceId,
          principalId: actorId,
          status: 'ACTIVE',
        },
        {
          id: randomUUID(),
          workspaceId: otherWorkspaceId,
          principalId: actorId,
          status: 'ACTIVE',
        },
      ],
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
        learning: {
          totalCourses: 0,
          linkedAssessmentsCount: 0,
        },
        assessment: {
          resultsReleased: 0,
        },
      },
      recentActivity: [],
    });
  });

  it('returns workspace-scoped creator metrics and safe recent activity', async () => {
    const courseId = '10000000-0000-4000-8000-000000000001';
    const sectionId = '10000000-0000-4000-8000-000000000002';
    const lessonId = '10000000-0000-4000-8000-000000000003';
    const enrollmentId = '10000000-0000-4000-8000-000000000004';
    const assessmentId = '10000000-0000-4000-8000-000000000005';
    const versionId = '10000000-0000-4000-8000-000000000006';
    const snapshotId = '10000000-0000-4000-8000-000000000007';
    const attemptId = '10000000-0000-4000-8000-000000000008';
    const contentId = '10000000-0000-4000-8000-000000000009';
    const contentVersionId = '10000000-0000-4000-8000-000000000010';
    const mediaAssetId = '10000000-0000-4000-8000-000000000011';
    const notificationId = '10000000-0000-4000-8000-000000000012';
    const campaignId = '10000000-0000-4000-8000-000000000013';

    await prisma.learningCourse.create({
      data: {
        id: courseId,
        tenantId,
        workspaceId,
        creatorPrincipalId: actorId,
        title: 'Analytics Course',
        slug: 'analytics-course',
        status: 'PUBLISHED',
        visibility: 'WORKSPACE',
      },
    });
    await prisma.learningSection.create({
      data: { id: sectionId, courseId, title: 'Section 1', position: 0 },
    });
    await prisma.learningLesson.create({
      data: {
        id: lessonId,
        sectionId,
        title: 'Lesson 1',
        kind: 'TEXT',
        position: 0,
      },
    });
    await prisma.learningEnrollment.create({
      data: {
        id: enrollmentId,
        tenantId,
        workspaceId,
        courseId,
        learnerPrincipalId: learnerId,
        status: 'COMPLETED',
        startedAt: new Date('2026-05-24T09:00:00.000Z'),
        completedAt: new Date('2026-05-25T09:00:00.000Z'),
      },
    });
    await prisma.learningProgress.create({
      data: {
        id: '10000000-0000-4000-8000-000000000014',
        tenantId,
        workspaceId,
        courseId,
        enrollmentId,
        lessonId,
        learnerPrincipalId: learnerId,
        status: 'COMPLETED',
        startedAt: new Date('2026-05-24T09:30:00.000Z'),
        completedAt: new Date('2026-05-25T09:00:00.000Z'),
      },
    });

    await prisma.assessment.create({
      data: {
        id: assessmentId,
        tenantId,
        workspaceId,
        ownerPrincipalId: actorId,
        purpose: 'QUIZ',
        status: 'PUBLISHED',
        visibility: 'WORKSPACE',
        title: 'Analytics Assessment',
        attemptPolicy: {},
        resultReleasePolicy: 'IMMEDIATE',
        metadata: {},
      },
    });
    await prisma.assessmentVersion.create({
      data: {
        id: versionId,
        assessmentId,
        versionNumber: 1,
        status: 'PUBLISHED_SNAPSHOT',
        createdByPrincipalId: actorId,
      },
    });
    await prisma.assessmentPublishedSnapshot.create({
      data: {
        id: snapshotId,
        assessmentId,
        versionId,
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        publishedByPrincipalId: actorId,
        publishedAt: new Date('2026-05-24T10:00:00.000Z'),
      },
    });
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        currentDraftVersionId: versionId,
        publishedSnapshotId: snapshotId,
        publishedAt: new Date('2026-05-24T10:00:00.000Z'),
      },
    });
    await prisma.learningAssessmentLink.create({
      data: {
        id: '10000000-0000-4000-8000-000000000015',
        tenantId,
        workspaceId,
        courseId,
        lessonId,
        assessmentId,
        position: 0,
        createdByPrincipalId: actorId,
      },
    });
    await prisma.assessmentAttempt.create({
      data: {
        id: attemptId,
        tenantId,
        workspaceId,
        assessmentId,
        snapshotId,
        snapshotVersionId: versionId,
        snapshotVersionNumber: 1,
        learnerPrincipalId: learnerId,
        status: 'SUBMITTED',
        startedAt: new Date('2026-05-25T10:00:00.000Z'),
        submittedAt: new Date('2026-05-25T10:30:00.000Z'),
        metadata: {},
      },
    });
    await prisma.assessmentAttemptResult.create({
      data: {
        id: '10000000-0000-4000-8000-000000000016',
        attemptId,
        gradingStatus: 'RELEASED',
        score: 91,
        maxScore: 100,
        releasedAt: new Date('2026-05-25T11:00:00.000Z'),
      },
    });

    await prisma.contentDocument.create({
      data: {
        id: contentId,
        tenantId,
        workspaceId,
        ownerPrincipalId: actorId,
        purpose: 'COURSE_CONTENT',
        status: 'PUBLISHED',
        title: 'Analytics Document',
      },
    });
    await prisma.contentVersion.create({
      data: {
        id: contentVersionId,
        documentId: contentId,
        versionNumber: 1,
        status: 'PUBLISHED_SNAPSHOT',
        createdByPrincipalId: actorId,
      },
    });

    await prisma.mediaAsset.create({
      data: {
        id: mediaAssetId,
        tenantId,
        workspaceId,
        ownerPrincipalId: actorId,
        filename: 'analytics.png',
        contentType: 'image/png',
        fileCategory: 'IMAGE',
        storageProvider: 'FIXTURE',
        objectKey: 'private/analytics.png',
        visibility: 'PRIVATE',
        status: 'FAILED',
        metadata: {},
        scanStatus: 'QUARANTINED',
      },
    });

    await prisma.notificationIntent.create({
      data: {
        id: notificationId,
        tenantId,
        workspaceId,
        channel: 'EMAIL',
        recipient: { email: 'learner@example.com' },
        subject: 'Hello',
        body: 'Private body text that must not enter analytics',
        priority: 'NORMAL',
        status: 'DISPATCHED',
        provider: 'FIXTURE',
        metadata: {},
        createdByPrincipalId: actorId,
      },
    });

    await prisma.campaign.create({
      data: {
        id: campaignId,
        tenantId,
        workspaceId,
        name: 'Analytics Campaign',
        status: 'SCHEDULED',
        channel: 'EMAIL',
        subject: 'Campaign Subject',
        body: 'Campaign Body',
        audienceType: 'ALL_WORKSPACE_MEMBERS',
        audienceConfig: {},
        createdByPrincipalId: actorId,
      },
    });

    await prisma.learningCourse.create({
      data: {
        id: '20000000-0000-4000-8000-000000000001',
        tenantId,
        workspaceId: otherWorkspaceId,
        creatorPrincipalId: actorId,
        title: 'Other Workspace Course',
        slug: 'other-workspace-course',
        status: 'PUBLISHED',
        visibility: 'WORKSPACE',
      },
    });

    await prisma.outboxMessage.createMany({
      data: [
        {
          id: '30000000-0000-4000-8000-000000000001',
          eventId: '40000000-0000-4000-8000-000000000001',
          eventName: 'learning.course.created',
          eventVersion: 1,
          tenantId,
          workspaceId,
          correlationId: 'cor-1',
          payload: { courseId, storageKey: 'hidden-key' },
          occurredAt: new Date('2026-05-25T09:00:00.000Z'),
        },
        {
          id: '30000000-0000-4000-8000-000000000002',
          eventId: '40000000-0000-4000-8000-000000000002',
          eventName: 'assessment.result.released',
          eventVersion: 1,
          tenantId,
          workspaceId,
          correlationId: 'cor-2',
          payload: { attemptId, score: 91, graderNotes: 'private' },
          occurredAt: new Date('2026-05-25T11:00:00.000Z'),
        },
        {
          id: '30000000-0000-4000-8000-000000000003',
          eventId: '40000000-0000-4000-8000-000000000003',
          eventName: 'communication.intent.dispatched',
          eventVersion: 1,
          tenantId,
          workspaceId,
          correlationId: 'cor-3',
          payload: {
            intentId: notificationId,
            providerConfig: { apiKey: 'secret' },
            body: 'raw body',
          },
          occurredAt: new Date('2026-05-25T12:00:00.000Z'),
        },
        {
          id: '30000000-0000-4000-8000-000000000004',
          eventId: '40000000-0000-4000-8000-000000000004',
          eventName: 'learning.course.created',
          eventVersion: 1,
          tenantId,
          workspaceId: otherWorkspaceId,
          correlationId: 'cor-4',
          payload: { courseId: '20000000-0000-4000-8000-000000000001' },
          occurredAt: new Date('2026-05-25T13:00:00.000Z'),
        },
      ],
    });

    const summaryResponse = await app.inject({
      method: 'GET',
      url: '/workspace/dashboard/creator/summary',
      headers,
    });
    const activityResponse = await app.inject({
      method: 'GET',
      url: '/workspace/dashboard/creator/activity',
      headers,
    });

    expect(summaryResponse.statusCode).toBe(200);
    expect(summaryResponse.json()).toMatchObject({
      workspaceId,
      totalCourses: 1,
      totalPublishedCourses: 1,
      totalAssessments: 1,
      totalActiveAssessments: 1,
      pendingGradingCount: 0,
      contentDocumentsCount: 1,
      mediaAssetsCount: 1,
      campaignsCount: 1,
      learning: {
        activeEnrollments: 0,
        courseCompletions: 1,
        lessonCompletions: 1,
        linkedAssessmentsCount: 1,
      },
      assessment: {
        attemptsStarted: 1,
        submissions: 1,
        pendingGrading: 0,
        resultsReleased: 1,
      },
      communication: {
        notificationIntentsCreated: 1,
        delivered: 1,
        failed: 0,
        pendingDelivery: 0,
      },
      campaign: {
        totalCampaigns: 1,
        scheduledCampaigns: 1,
      },
    });

    expect(activityResponse.statusCode).toBe(200);
    expect(activityResponse.json()).toEqual([
      expect.objectContaining({
        id: '40000000-0000-4000-8000-000000000003',
        category: 'COMMUNICATION',
        subjectType: 'NOTIFICATION_INTENT',
      }),
      expect.objectContaining({
        id: '40000000-0000-4000-8000-000000000002',
        category: 'ASSESSMENT',
        subjectType: 'ASSESSMENT_RESULT',
      }),
      expect.objectContaining({
        id: '40000000-0000-4000-8000-000000000001',
        category: 'LEARNING',
        subjectType: 'COURSE',
      }),
    ]);
    expect(JSON.stringify(activityResponse.json())).not.toContain('storageKey');
    expect(JSON.stringify(activityResponse.json())).not.toContain('graderNotes');
    expect(JSON.stringify(activityResponse.json())).not.toContain('providerConfig');
    expect(JSON.stringify(activityResponse.json())).not.toContain('secret');
    expect(JSON.stringify(activityResponse.json())).not.toContain(otherWorkspaceId);
  });

  it('blocks creator analytics reads when dashboard permission is denied', async () => {
    allowDashboardRead = false;

    const response = await app.inject({
      method: 'GET',
      url: '/workspace/dashboard/creator/summary',
      headers,
    });

    expect(response.statusCode).toBe(403);
  });
});
