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

describe.sequential('Assessment attempt concurrency (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const headers = {
    'x-request-id': 'a1111111-1111-4111-8111-111111111111',
    'x-correlation-id': 'a2222222-2222-4222-8222-222222222222',
    'x-tenant-id': 'a3333333-3333-4333-8333-333333333333',
    'x-workspace-id': 'a4444444-4444-4444-8444-444444444444',
    'x-actor-id': 'a5555555-5555-4555-8555-555555555555',
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
          operation({ transactionId: 'tx-assessment-attempt-concurrency-test', client: tx }),
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

  async function createPublishedAssessment() {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/assessments',
      headers,
      payload: { title: 'Concurrency Quiz', purpose: 'QUIZ', timeLimitMinutes: 20 },
    });
    expectHttpStatus(createRes, 201);
    const assessmentId = createRes.json<{ id: string }>().id;
    const questionId = 'a6666666-6666-4666-8666-666666666666';
    const optionIds = [
      'a7777777-7777-4777-8777-777777777771',
      'a7777777-7777-4777-8777-777777777772',
      'a7777777-7777-4777-8777-777777777773',
      'a7777777-7777-4777-8777-777777777774',
    ];

    const replaceRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessments/${assessmentId}/content`,
      headers,
      payload: {
        sections: [],
        looseQuestions: [
          {
            id: questionId,
            kind: 'MCQ',
            title: 'Question 1',
            prompt: { text: 'Question 1' },
            options: optionIds.map((id, index) => ({
              id,
              label: `Option ${index + 1}`,
              value: `option-${index + 1}`,
              isCorrect: index === 0,
            })),
            answerKey: { correctOptionIds: [optionIds[0]] },
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
      headers,
    });
    expectHttpStatus(publishRes, 201);

    return { assessmentId, questionId, optionIds };
  }

  it('coalesces concurrent start, save, and submit requests into one attempt lifecycle', async () => {
    const { assessmentId, questionId, optionIds } = await createPublishedAssessment();

    const startResponses = await Promise.all(
      Array.from({ length: 5 }, () =>
        app.inject({
          method: 'POST',
          url: `/workspace/assessments/${assessmentId}/attempts`,
          headers,
          payload: { metadata: { source: 'race-test' } },
        }),
      ),
    );

    const startedPayloads = startResponses.map((response) => {
      expectHttpStatus(response, 201);
      return response.json<{ id: string; status: string }>();
    });
    const attemptIds = new Set(startedPayloads.map((payload) => payload.id));
    expect(attemptIds.size).toBe(1);

    const attemptId = startedPayloads[0]!.id;
    expect(
      await prisma.assessmentAttempt.count({
        where: { assessmentId, learnerPrincipalId: headers['x-actor-id'] },
      }),
    ).toBe(1);
    expect(
      await prisma.outboxMessage.count({ where: { eventName: 'assessment.attempt.started' } }),
    ).toBe(1);

    const saveResponses = await Promise.all(
      optionIds.map((optionId) =>
        app.inject({
          method: 'PUT',
          url: `/workspace/assessment-attempts/${attemptId}/answers/${questionId}`,
          headers,
          payload: {
            questionId,
            questionKind: 'MCQ',
            answer: { selectedOptionId: optionId },
          },
        }),
      ),
    );
    saveResponses.forEach((response) => expectHttpStatus(response, 200));

    const answerRows = await prisma.assessmentAttemptAnswer.findMany({ where: { attemptId } });
    expect(answerRows).toHaveLength(1);
    expect(optionIds).toContain(
      (answerRows[0]!.answer as { selectedOptionId?: string }).selectedOptionId ?? '',
    );

    const submitResponses = await Promise.all(
      Array.from({ length: 5 }, () =>
        app.inject({
          method: 'POST',
          url: `/workspace/assessment-attempts/${attemptId}/submit`,
          headers,
        }),
      ),
    );
    submitResponses.forEach((response) => {
      expectHttpStatus(response, 201);
      expect(response.json()).toMatchObject({ id: attemptId, status: 'SUBMITTED' });
    });

    expect(await prisma.assessmentAttemptResult.count({ where: { attemptId } })).toBe(1);
    expect(
      await prisma.auditRecord.count({
        where: { targetId: attemptId, action: 'assessment.attempt.submitted' },
      }),
    ).toBe(1);
    expect(
      await prisma.outboxMessage.count({ where: { eventName: 'assessment.attempt.submitted' } }),
    ).toBe(1);
    expect(
      await prisma.outboxMessage.count({
        where: { eventName: 'assessment.attempt.result.placeholder_created' },
      }),
    ).toBe(1);
  });
});
