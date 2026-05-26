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

describe.sequential('Assessment attempt reliability (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const creatorHeaders = {
    'x-request-id': 'b1111111-1111-4111-8111-111111111111',
    'x-correlation-id': 'b2222222-2222-4222-8222-222222222222',
    'x-tenant-id': 'b3333333-3333-4333-8333-333333333333',
    'x-workspace-id': 'b4444444-4444-4444-8444-444444444444',
    'x-actor-id': 'b5555555-5555-4555-8555-555555555555',
  } as const;

  const learnerHeaders = {
    ...creatorHeaders,
    'x-actor-id': 'b6666666-6666-4666-8666-666666666666',
  } as const;

  beforeAll(async () => {
    const prismaRef: { current: PrismaService | undefined } = { current: undefined };
    const permissionEvaluator: PermissionEvaluator = { evaluate: async () => ({ allowed: true }) };
    const transactionRunner: TransactionRunner = {
      run: async <T>(operation: Parameters<TransactionRunner['run']>[0]): Promise<T> => {
        if (!prismaRef.current) {
          throw new Error('prismaRef not initialized');
        }
        return prismaRef.current.$transaction(async (tx) =>
          operation({ transactionId: 'tx-assessment-attempt-reliability-test', client: tx }),
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

  async function createPublishedAssessment(timeLimitMinutes?: number) {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/assessments',
      headers: creatorHeaders,
      payload: {
        title: 'Reliability Quiz',
        purpose: 'QUIZ',
        ...(timeLimitMinutes !== undefined ? { timeLimitMinutes } : {}),
      },
    });
    expectHttpStatus(createRes, 201);
    const assessmentId = createRes.json<{ id: string }>().id;
    const questionId = 'b7777777-7777-4777-8777-777777777777';
    const optionId = 'b8888888-8888-4888-8888-888888888888';

    const replaceRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessments/${assessmentId}/content`,
      headers: creatorHeaders,
      payload: {
        sections: [],
        looseQuestions: [
          {
            id: questionId,
            kind: 'MCQ',
            title: 'Question 1',
            prompt: { text: 'Question 1' },
            options: [
              { id: optionId, label: 'A', value: 'a', isCorrect: true },
              {
                id: 'b9999999-9999-4999-8999-999999999999',
                label: 'B',
                value: 'b',
                isCorrect: false,
              },
            ],
            answerKey: { correctOptionIds: [optionId] },
            points: 1,
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

    return { assessmentId, questionId, optionId };
  }

  async function startAttempt(assessmentId: string) {
    const startRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessmentId}/attempts`,
      headers: learnerHeaders,
    });
    expectHttpStatus(startRes, 201);
    return startRes.json<{ id: string }>().id;
  }

  it('marks timed attempts expired at the boundary and blocks save plus submit', async () => {
    const { assessmentId, questionId, optionId } = await createPublishedAssessment(5);
    const attemptId = await startAttempt(assessmentId);
    const boundary = new Date(Date.now() - 1000);

    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { expiresAt: boundary, updatedAt: boundary },
    });
    await prisma.assessmentAttemptSession.update({
      where: { attemptId },
      data: { expiresAt: boundary },
    });

    const saveRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${attemptId}/answers/${questionId}`,
      headers: learnerHeaders,
      payload: {
        questionId,
        questionKind: 'MCQ',
        answer: { selectedOptionId: optionId },
      },
    });
    expectHttpStatus(saveRes, 409);
    expect(saveRes.json()).toMatchObject({
      error: {
        code: 'CONFLICT',
        details: {
          reason: 'ATTEMPT_EXPIRED',
          attemptStatus: 'EXPIRED',
        },
      },
    });

    const submitRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/submit`,
      headers: learnerHeaders,
    });
    expectHttpStatus(submitRes, 409);
    expect(submitRes.json()).toMatchObject({
      error: {
        code: 'CONFLICT',
        details: {
          reason: 'ATTEMPT_NOT_SUBMITTABLE',
          attemptStatus: 'EXPIRED',
        },
      },
    });

    const attempt = await prisma.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(attempt.status).toBe('EXPIRED');
    expect(await prisma.assessmentAttemptAnswer.count({ where: { attemptId } })).toBe(0);
    expect(await prisma.assessmentAttemptResult.count({ where: { attemptId } })).toBe(0);
  });

  it('allows untimed attempts to save and submit normally', async () => {
    const { assessmentId, questionId, optionId } = await createPublishedAssessment();
    const attemptId = await startAttempt(assessmentId);

    const saveRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${attemptId}/answers/${questionId}`,
      headers: learnerHeaders,
      payload: {
        questionId,
        questionKind: 'MCQ',
        answer: { selectedOptionId: optionId },
      },
    });
    expectHttpStatus(saveRes, 200);

    const submitRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attemptId}/submit`,
      headers: learnerHeaders,
    });
    expectHttpStatus(submitRes, 201);
    expect(submitRes.json()).toMatchObject({ id: attemptId, status: 'SUBMITTED' });
  });
});
