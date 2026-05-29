import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
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

describe.sequential('Assessment coding analytics API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const creatorHeaders = {
    'x-request-id': '91111111-1111-4111-8111-111111111111',
    'x-correlation-id': '92222222-2222-4222-8222-222222222222',
    'x-tenant-id': '93333333-3333-4333-8333-333333333333',
    'x-workspace-id': '94444444-4444-4444-8444-444444444444',
    'x-actor-id': '95555555-5555-4555-8555-555555555555',
  } as const;

  const learnerHeaders = {
    ...creatorHeaders,
    'x-actor-id': '96666666-6666-4666-8666-666666666666',
  } as const;

  beforeAll(async () => {
    const prismaRef: { current: PrismaService | undefined } = { current: undefined };
    const permissionEvaluator: PermissionEvaluator = {
      evaluate: async ({ permission }) => {
        const permissionKey = String(permission);
        if (permissionKey === 'assessment.result.read.workspace') {
          return { allowed: true };
        }
        return { allowed: true };
      },
    };
    const transactionRunner: TransactionRunner = {
      run: async <T>(operation: Parameters<TransactionRunner['run']>[0]): Promise<T> => {
        if (!prismaRef.current) throw new Error('prismaRef not initialized');
        return prismaRef.current.$transaction(async (tx) =>
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
    prismaRef.current = prisma;
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
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

  it('calculates coding assessment analytics correctly', async () => {
    // 1. Create assessment
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/assessments',
      headers: creatorHeaders,
      payload: { title: 'Coding Quiz', purpose: 'QUIZ', timeLimitMinutes: 20 },
    });
    expectHttpStatus(createRes, 201);
    const assessmentId = createRes.json<{ id: string }>().id;

    // 2. Publish assessment with a coding question
    const codeQuestionId = '96666666-6666-4666-8666-666666666669';
    const replaceRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessments/${assessmentId}/content`,
      headers: creatorHeaders,
      payload: {
        sections: [],
        looseQuestions: [
          {
            id: codeQuestionId,
            kind: 'CODE',
            title: 'Sum of Array',
            prompt: { text: 'Sum of Array' },
            options: [],
            points: 10,
            gradingMode: 'AUTO',
            position: 0,
          },
        ],
      },
    });
    expectHttpStatus(replaceRes, 200);

    const publishRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessmentId}/publish`,
      headers: creatorHeaders,
    });
    expectHttpStatus(publishRes, 201);

    // 3. Start a student attempt
    const startRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessmentId}/attempts`,
      headers: learnerHeaders,
    });
    expectHttpStatus(startRes, 201);
    const attemptId = startRes.json<{ id: string }>().id;

    // 4. Save a coding answer
    const saveAnswerRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${attemptId}/answers/${codeQuestionId}`,
      headers: learnerHeaders,
      payload: {
        questionId: codeQuestionId,
        questionKind: 'CODE',
        answer: { language: 'python', sourceCode: 'def sum(arr): return 0' },
      },
    });
    expectHttpStatus(saveAnswerRes, 200);

    // 5. Submit the attempt
    const submitRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/submit`,
      headers: learnerHeaders,
    });
    expectHttpStatus(submitRes, 201);

    // 6. Setup database mocks directly to simulate grading
    const attempt = await prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });

    const gradingRun = await prisma.assessmentGradingRun.create({
      data: {
        id: randomUUID(),
        attemptId,
        tenantId: creatorHeaders['x-tenant-id'],
        workspaceId: creatorHeaders['x-workspace-id'],
        assessmentId,
        snapshotId: attempt.snapshotId,
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: {},
      },
    });

    const answer = await prisma.assessmentAttemptAnswer.findFirstOrThrow({
      where: { attemptId, questionId: codeQuestionId },
    });

    await prisma.assessmentAnswerGrade.create({
      data: {
        id: randomUUID(),
        gradingRunId: gradingRun.id,
        attemptId,
        answerId: answer.id,
        questionId: codeQuestionId,
        questionKind: 'CODE',
        status: 'AUTO_GRADED',
        method: 'CODE_EXECUTION_RESERVED',
        score: 10,
        maxScore: 10,
        metadata: {},
        feedback: {
          verdict: 'ACCEPTED',
          publicTestResults: [{ passed: true }],
          passedHiddenCount: 2,
          totalHiddenCount: 2,
        },
      },
    });

    // 7. Request coding analytics
    const analyticsRes = await app.inject({
      method: 'GET',
      url: `/workspace/assessments/${assessmentId}/analytics/coding`,
      headers: creatorHeaders,
    });
    expectHttpStatus(analyticsRes, 200);
    const analytics = analyticsRes.json();

    expect(analytics.assessmentId).toBe(assessmentId);
    expect(analytics.overview.totalCodingAnswers).toBe(1);
    expect(analytics.overview.gradedCodingAnswers).toBe(1);
    expect(analytics.overview.averageScorePercent).toBe(100);
    expect(analytics.overview.passRatePercent).toBe(100);

    expect(analytics.languageDistribution).toContainEqual({
      language: 'python',
      displayName: 'Python 3',
      count: 1,
    });

    expect(analytics.verdictDistribution).toContainEqual({
      verdict: 'ACCEPTED',
      count: 1,
    });

    expect(analytics.questionPerformance).toHaveLength(1);
    expect(analytics.questionPerformance[0]).toMatchObject({
      questionId: codeQuestionId,
      title: 'Sum of Array',
      gradedAnswers: 1,
      averageScorePercent: 100,
      passRatePercent: 100,
      publicPassedCount: 1,
      publicTotalCount: 1,
      hiddenPassedCount: 2,
      hiddenTotalCount: 2,
    });
  });
});
