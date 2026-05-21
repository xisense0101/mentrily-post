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

describe.sequential('Assessment result API (integration)', () => {
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

  const learnerBlockedHeaders = {
    ...creatorHeaders,
    'x-actor-id': 'learner-blocked',
  } as const;

  beforeAll(async () => {
    const prismaRef: { current: PrismaService | undefined } = { current: undefined };
    const permissionEvaluator: PermissionEvaluator = {
      evaluate: async ({ permission, workspace }) => {
        const actorId = workspace?.actorId;
        const permissionKey = String(permission);
        if (!actorId) {
          return { allowed: false };
        }
        if (actorId === 'learner-blocked' && permissionKey === 'assessment.result.release') {
          return { allowed: false };
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

  function expectHttpStatus(response: { statusCode: number; body: string }, expected: number): void {
    if (response.statusCode !== expected) {
      throw new Error(`Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}`);
    }
  }

  async function createAssessment() {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/assessments',
      headers: creatorHeaders,
      payload: { title: 'Result Quiz', purpose: 'QUIZ', timeLimitMinutes: 20 },
    });
    expectHttpStatus(createRes, 201);
    return createRes.json<{ id: string }>().id;
  }

  async function publishAssessment(assessmentId: string) {
    const mcqOption = '97777777-7777-4777-8777-777777777777';
    const longQuestionId = '96666666-6666-4666-8666-666666666667';
    const mcqQuestionId = '95555555-5555-4555-8555-555555555556';
    const replaceRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessments/${assessmentId}/content`,
      headers: creatorHeaders,
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
              { id: '98888888-8888-4888-8888-888888888888', label: 'B', value: 'b', isCorrect: false },
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
      headers: creatorHeaders,
    });
    expectHttpStatus(publishRes, 201);
    return { mcqQuestionId, mcqOption, longQuestionId };
  }

  async function createSubmittedAttempt(assessmentId: string, questionIds: { mcqQuestionId: string; mcqOption: string; longQuestionId: string }) {
    const startRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessmentId}/attempts`,
      headers: learnerHeaders,
    });
    expectHttpStatus(startRes, 201);
    const attempt = startRes.json<{ id: string }>();

    await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${attempt.id}/answers/${questionIds.mcqQuestionId}`,
      headers: learnerHeaders,
      payload: {
        questionId: questionIds.mcqQuestionId,
        questionKind: 'MCQ',
        answer: { selectedOptionId: questionIds.mcqOption },
      },
    });
    await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${attempt.id}/answers/${questionIds.longQuestionId}`,
      headers: learnerHeaders,
      payload: {
        questionId: questionIds.longQuestionId,
        questionKind: 'LONG_ANSWER',
        answer: { text: 'essay' },
      },
    });
    const submitRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attempt.id}/submit`,
      headers: learnerHeaders,
    });
    expectHttpStatus(submitRes, 201);
    return attempt.id;
  }

  async function gradeAndComplete(attemptId: string) {
    const gradeRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/grade`,
      headers: creatorHeaders,
    });
    expectHttpStatus(gradeRes, 201);
    const gradingRun = gradeRes.json<{ id: string; answerGrades: Array<{ answerId: string; status: string }> }>();
    const pendingAnswer = gradingRun.answerGrades.find((item) => item.status === 'PENDING_MANUAL_REVIEW');
    expect(pendingAnswer).toBeTruthy();

    const manualGradeRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-grading-runs/${gradingRun.id}/answers/${pendingAnswer!.answerId}/manual-grade`,
      headers: creatorHeaders,
      payload: { score: 3, feedback: { note: 'complete' } },
    });
    expectHttpStatus(manualGradeRes, 201);
    return manualGradeRes.json<{ id: string; status: string }>();
  }

  it('releases graded attempt result, learner reads released result, and audit/outbox persist', async () => {
    const assessmentId = await createAssessment();
    const questionIds = await publishAssessment(assessmentId);
    const attemptId = await createSubmittedAttempt(assessmentId, questionIds);
    await gradeAndComplete(attemptId);

    const instructorBeforeRelease = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${attemptId}/results/instructor`,
      headers: creatorHeaders,
    });
    expectHttpStatus(instructorBeforeRelease, 200);
    expect(instructorBeforeRelease.json()).toMatchObject({
      attemptId,
      gradingStatus: 'GRADED',
    });

    const unreleasedLearnerRead = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${attemptId}/results/me`,
      headers: learnerHeaders,
    });
    expectHttpStatus(unreleasedLearnerRead, 403);
    expect(unreleasedLearnerRead.body).not.toContain('score');

    const releaseRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/results/release`,
      headers: creatorHeaders,
      payload: {},
    });
    expectHttpStatus(releaseRes, 201);
    expect(releaseRes.json()).toMatchObject({
      attemptId,
      gradingStatus: 'RELEASED',
      score: 4,
      maxScore: 4,
    });
    expect(releaseRes.json().releasedAt).toBeTruthy();

    const learnerRead = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${attemptId}/results/me`,
      headers: learnerHeaders,
    });
    expectHttpStatus(learnerRead, 200);
    expect(learnerRead.json()).toMatchObject({
      attemptId,
      gradingStatus: 'RELEASED',
      score: 4,
      maxScore: 4,
    });
    expect(learnerRead.body).not.toContain('correctOptionIds');
    expect(learnerRead.body).not.toContain('answerKey');
    expect(learnerRead.body).not.toContain('learnerAnswer');

    const instructorRead = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${attemptId}/results/instructor`,
      headers: creatorHeaders,
    });
    expectHttpStatus(instructorRead, 200);
    expect(instructorRead.json().answers.some((answer: { learnerAnswer?: unknown }) => answer.learnerAnswer !== undefined)).toBe(true);

    const attemptResult = await prisma.assessmentAttemptResult.findFirstOrThrow({ where: { attemptId } });
    expect(attemptResult.gradingStatus).toBe('RELEASED');
    expect(attemptResult.releasedAt).not.toBeNull();

    const auditCount = await prisma.auditRecord.count({
      where: { targetId: attemptResult.id, targetType: 'assessment-attempt-result' },
    });
    const outboxCount = await prisma.outboxMessage.count({
      where: { eventName: 'assessment.result.released' },
    });
    expect(auditCount).toBe(1);
    expect(outboxCount).toBe(1);
  });

  it('rejects repeated release without duplicating release side effects', async () => {
    const assessmentId = await createAssessment();
    const questionIds = await publishAssessment(assessmentId);
    const attemptId = await createSubmittedAttempt(assessmentId, questionIds);
    await gradeAndComplete(attemptId);

    const firstRelease = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/results/release`,
      headers: creatorHeaders,
      payload: {},
    });
    expectHttpStatus(firstRelease, 201);

    const secondRelease = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/results/release`,
      headers: creatorHeaders,
      payload: {},
    });
    expectHttpStatus(secondRelease, 400);

    expect(await prisma.auditRecord.count({ where: { action: 'assessment.result.released' } })).toBe(1);
    expect(await prisma.outboxMessage.count({ where: { eventName: 'assessment.result.released' } })).toBe(1);
  });

  it('learner cannot release result and cross-workspace result access fails', async () => {
    const assessmentId = await createAssessment();
    const questionIds = await publishAssessment(assessmentId);
    const attemptId = await createSubmittedAttempt(assessmentId, questionIds);
    await gradeAndComplete(attemptId);

    const learnerRelease = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/results/release`,
      headers: learnerBlockedHeaders,
      payload: {},
    });
    expectHttpStatus(learnerRelease, 403);

    const crossWorkspaceHeaders = {
      ...creatorHeaders,
      'x-workspace-id': '9aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    };
    const crossWorkspaceRead = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${attemptId}/results/instructor`,
      headers: crossWorkspaceHeaders,
    });
    expectHttpStatus(crossWorkspaceRead, 404);

    const crossWorkspaceLearner = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${attemptId}/results/me`,
      headers: { ...learnerHeaders, 'x-workspace-id': '9aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    });
    expectHttpStatus(crossWorkspaceLearner, 404);
  });
});
