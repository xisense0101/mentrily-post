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

describe.sequential('Assessment grading API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const headers = {
    'x-request-id': '81111111-1111-4111-8111-111111111111',
    'x-correlation-id': '82222222-2222-4222-8222-222222222222',
    'x-tenant-id': '83333333-3333-4333-8333-333333333333',
    'x-workspace-id': '84444444-4444-4444-8444-444444444444',
    'x-actor-id': '85555555-5555-4555-8555-555555555555',
  } as const;

  beforeAll(async () => {
    const prismaRef: { current: PrismaService | undefined } = { current: undefined };
    const permissionEvaluator: PermissionEvaluator = {
      evaluate: async ({ permission, workspace }) => ({
        allowed: !(
          workspace?.actorId === 'learner-blocked' &&
          String(permission).startsWith('assessment.grading')
        ),
      }),
    };
    const transactionRunner: TransactionRunner = {
      run: async <T>(operation: Parameters<TransactionRunner['run']>[0]): Promise<T> => {
        if (!prismaRef.current) {
          throw new Error('prismaRef not initialized');
        }
        return prismaRef.current.$transaction(async (tx) =>
          operation({ transactionId: 'tx-assessment-grading-api-test', client: tx }),
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

  async function createAssessment() {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/assessments',
      headers,
      payload: { title: 'Grading Quiz', purpose: 'QUIZ', timeLimitMinutes: 20 },
    });
    expectHttpStatus(createRes, 201);
    return createRes.json<{ id: string }>().id;
  }

  async function publishAssessment(assessmentId: string) {
    const mcqOption = '87777777-7777-4777-8777-777777777777';
    const longQuestionId = '86666666-6666-4666-8666-666666666666';
    const mcqQuestionId = '85555555-5555-4555-8555-555555555556';
    const replaceRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessments/${assessmentId}/content`,
      headers,
      payload: {
        sections: [],
        looseQuestions: [
          {
            id: mcqQuestionId,
            kind: 'MCQ',
            title: 'Q1',
            prompt: { text: 'Q1' },
            options: [
              { id: mcqOption, label: 'A', value: 'a', isCorrect: true },
              {
                id: '88888888-8888-4888-8888-888888888888',
                label: 'B',
                value: 'b',
                isCorrect: false,
              },
            ],
            answerKey: { correctOptionIds: [mcqOption] },
            points: 1,
            gradingMode: 'AUTO',
            position: 0,
          },
          {
            id: longQuestionId,
            kind: 'LONG_ANSWER',
            title: 'Explain',
            prompt: { text: 'Explain' },
            options: [],
            points: 3,
            gradingMode: 'MANUAL',
            position: 1,
          },
        ],
      },
    });
    expectHttpStatus(replaceRes, 200);
    const publishRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessmentId}/publish`,
      headers,
    });
    expectHttpStatus(publishRes, 201);
    return { mcqQuestionId, mcqOption, longQuestionId };
  }

  async function createSubmittedAttempt(
    assessmentId: string,
    questionIds: { mcqQuestionId: string; mcqOption: string; longQuestionId: string },
  ) {
    const startRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessmentId}/attempts`,
      headers,
    });
    expectHttpStatus(startRes, 201);
    const attempt = startRes.json<{ id: string }>();

    await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${attempt.id}/answers/${questionIds.mcqQuestionId}`,
      headers,
      payload: {
        questionId: questionIds.mcqQuestionId,
        questionKind: 'MCQ',
        answer: { selectedOptionId: questionIds.mcqOption },
      },
    });
    await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${attempt.id}/answers/${questionIds.longQuestionId}`,
      headers,
      payload: {
        questionId: questionIds.longQuestionId,
        questionKind: 'LONG_ANSWER',
        answer: { text: 'essay' },
      },
    });
    const submitRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attempt.id}/submit`,
      headers,
    });
    expectHttpStatus(submitRes, 201);
    return attempt.id;
  }

  it('grades attempts, loads latest run, lists pending review, and manual grades completion', async () => {
    const assessmentId = await createAssessment();
    const questionIds = await publishAssessment(assessmentId);
    const attemptId = await createSubmittedAttempt(assessmentId, questionIds);

    const gradeRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/grade`,
      headers,
    });
    expectHttpStatus(gradeRes, 201);
    const gradingRun = gradeRes.json<{
      id: string;
      status: string;
      hasPendingManualReview: boolean;
      answerGrades: Array<{ answerId: string; status: string }>;
    }>();
    expect(gradingRun.status).toBe('PARTIAL');
    expect(gradingRun.hasPendingManualReview).toBe(true);

    const latestRes = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${attemptId}/grading/latest`,
      headers,
    });
    expectHttpStatus(latestRes, 200);
    expect(latestRes.json().id).toBe(gradingRun.id);

    const pendingRes = await app.inject({
      method: 'GET',
      url: '/workspace/assessment-grading/manual-review',
      headers,
    });
    expectHttpStatus(pendingRes, 200);
    const pending = pendingRes.json<{
      items: Array<{
        answerId: string;
        questionTitle?: string;
        learnerAnswer: Record<string, unknown>;
      }>;
    }>();
    expect(pending.items).toHaveLength(1);
    expect(pending.items[0]?.questionTitle).toBe('Explain');
    expect(pending.items[0]?.learnerAnswer).toMatchObject({ text: 'essay' });

    const runRes = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-grading-runs/${gradingRun.id}`,
      headers,
    });
    expectHttpStatus(runRes, 200);

    const manualGradeRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-grading-runs/${gradingRun.id}/answers/${pending.items[0]!.answerId}/manual-grade`,
      headers,
      payload: { score: 3, feedback: { note: 'complete' } },
    });
    expectHttpStatus(manualGradeRes, 201);
    expect(manualGradeRes.json()).toMatchObject({
      status: 'COMPLETED',
      totalScore: 4,
      maxScore: 4,
    });

    const attemptResult = await prisma.assessmentAttemptResult.findFirstOrThrow({
      where: { attemptId },
    });
    expect(attemptResult.gradingStatus).toBe('GRADED');
  });

  it('allows repeated grading requests without corrupting the result placeholder', async () => {
    const assessmentId = await createAssessment();
    const questionIds = await publishAssessment(assessmentId);
    const attemptId = await createSubmittedAttempt(assessmentId, questionIds);

    const firstGrade = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/grade`,
      headers,
    });
    expectHttpStatus(firstGrade, 201);

    const secondGrade = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/grade`,
      headers,
    });
    expectHttpStatus(secondGrade, 201);

    const result = await prisma.assessmentAttemptResult.findUniqueOrThrow({ where: { attemptId } });
    expect(result.attemptId).toBe(attemptId);
    expect(await prisma.assessmentAttemptResult.count({ where: { attemptId } })).toBe(1);
    expect(await prisma.assessmentGradingRun.count({ where: { attemptId } })).toBe(2);
  });

  it('blocks learner grading and cross-workspace grading', async () => {
    const assessmentId = await createAssessment();
    const questionIds = await publishAssessment(assessmentId);
    const attemptId = await createSubmittedAttempt(assessmentId, questionIds);

    const learnerHeaders = { ...headers, 'x-actor-id': 'learner-blocked' };
    const denied = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/grade`,
      headers: learnerHeaders,
    });
    expectHttpStatus(denied, 403);

    const crossWorkspace = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/grade`,
      headers: { ...headers, 'x-workspace-id': '8aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    });
    expectHttpStatus(crossWorkspace, 404);

    const deniedQueue = await app.inject({
      method: 'GET',
      url: '/workspace/assessment-grading/manual-review',
      headers: learnerHeaders,
    });
    expectHttpStatus(deniedQueue, 403);
  });
});
