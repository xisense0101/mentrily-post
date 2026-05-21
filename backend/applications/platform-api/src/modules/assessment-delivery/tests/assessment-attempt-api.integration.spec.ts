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

describe.sequential('Assessment attempt API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const headers = {
    'x-request-id': '71111111-1111-4111-8111-111111111111',
    'x-correlation-id': '72222222-2222-4222-8222-222222222222',
    'x-tenant-id': '73333333-3333-4333-8333-333333333333',
    'x-workspace-id': '74444444-4444-4444-8444-444444444444',
    'x-actor-id': '75555555-5555-4555-8555-555555555555',
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
          operation({ transactionId: 'tx-assessment-attempt-api-test', client: tx }),
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

  async function truncateWithRetry(): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await truncatePublicSchema(prisma);
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('40P01')) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  beforeEach(async () => {
    await truncateWithRetry();
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
      payload: { title: 'Learner Quiz', purpose: 'QUIZ', timeLimitMinutes: 20 },
    });
    expectHttpStatus(createRes, 201);
    const created = createRes.json<{ id: string }>();

    const questionId = '76666666-6666-4666-8666-666666666666';
    const optionId = '77777777-7777-4777-8777-777777777777';

    const replaceRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessments/${created.id}/content`,
      headers,
      payload: {
        sections: [],
        looseQuestions: [
          {
            id: questionId,
            kind: 'MCQ',
            title: 'Q1',
            prompt: { text: 'Q1' },
            options: [
              { id: optionId, label: 'A', value: 'a', isCorrect: true },
              {
                id: '78888888-8888-4888-8888-888888888888',
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
      url: `/workspace/assessments/${created.id}/publish`,
      headers,
    });
    expectHttpStatus(publishRes, 201);

    return { assessmentId: created.id, questionId, optionId };
  }

  async function startAttempt(assessmentId: string) {
    const startRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessmentId}/attempts`,
      headers,
      payload: { metadata: { source: 'integration-test' } },
    });
    expectHttpStatus(startRes, 201);
    return startRes.json<{ id: string; snapshotId: string; status: string }>();
  }

  it('supports the learner attempt lifecycle and persists audit/outbox', async () => {
    const { assessmentId, questionId, optionId } = await createPublishedAssessment();
    const started = await startAttempt(assessmentId);

    expect(started.status).toBe('IN_PROGRESS');
    expect(started.snapshotId).toBeTruthy();

    const firstSave = await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${started.id}/answers/${questionId}`,
      headers,
      payload: {
        questionId,
        questionKind: 'MCQ',
        answer: { selectedOptionId: optionId },
        metadata: { autosave: true },
      },
    });
    expectHttpStatus(firstSave, 200);
    expect(firstSave.json().answers).toHaveLength(1);

    const secondSave = await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${started.id}/answers/${questionId}`,
      headers,
      payload: {
        questionId,
        questionKind: 'MCQ',
        answer: { selectedOptionId: '79999999-9999-4999-8999-999999999999' },
      },
    });
    expectHttpStatus(secondSave, 200);
    expect(secondSave.json().answers).toHaveLength(1);
    expect(secondSave.json().answers[0].answer).toMatchObject({
      selectedOptionId: '79999999-9999-4999-8999-999999999999',
    });

    const listRes = await app.inject({
      method: 'GET',
      url: '/workspace/assessment-attempts',
      headers,
    });
    expectHttpStatus(listRes, 200);
    expect(listRes.json()).toHaveLength(1);

    const getRes = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${started.id}`,
      headers,
    });
    expectHttpStatus(getRes, 200);
    expect(getRes.json()).toMatchObject({ id: started.id, assessmentId });

    const snapshotRes = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${started.id}/snapshot`,
      headers,
    });
    expectHttpStatus(snapshotRes, 200);
    expect(snapshotRes.json()).toMatchObject({
      assessmentId,
      looseQuestions: [
        expect.objectContaining({
          id: questionId,
          title: 'Q1',
        }),
      ],
    });
    expect(snapshotRes.body).not.toContain('currentDraftVersion');

    const submitRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${started.id}/submit`,
      headers,
    });
    expectHttpStatus(submitRes, 201);
    expect(submitRes.json()).toMatchObject({
      id: started.id,
      status: 'SUBMITTED',
      result: { gradingStatus: 'NOT_GRADED' },
    });

    const saveAfterSubmit = await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${started.id}/answers/${questionId}`,
      headers,
      payload: {
        questionId,
        questionKind: 'MCQ',
        answer: { selectedOptionId: optionId },
      },
    });
    expectHttpStatus(saveAfterSubmit, 400);

    const auditCount = await prisma.auditRecord.count({
      where: { targetId: started.id, targetType: 'assessment-attempt' },
    });
    const outboxCount = await prisma.outboxMessage.count({
      where: { eventName: { startsWith: 'assessment.attempt.' } },
    });
    expect(auditCount).toBe(4);
    expect(outboxCount).toBeGreaterThanOrEqual(4);
  });

  it('treats repeated start and submit requests as safe retries', async () => {
    const { assessmentId } = await createPublishedAssessment();

    const firstStart = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessmentId}/attempts`,
      headers,
    });
    const secondStart = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessmentId}/attempts`,
      headers,
    });
    expectHttpStatus(firstStart, 201);
    expectHttpStatus(secondStart, 201);

    const firstAttempt = firstStart.json<{ id: string }>();
    const secondAttempt = secondStart.json<{ id: string }>();
    expect(secondAttempt.id).toBe(firstAttempt.id);
    expect(await prisma.assessmentAttempt.count({ where: { assessmentId } })).toBe(1);
    expect(
      await prisma.outboxMessage.count({ where: { eventName: 'assessment.attempt.started' } }),
    ).toBe(1);

    const firstSubmit = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${firstAttempt.id}/submit`,
      headers,
    });
    const secondSubmit = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${firstAttempt.id}/submit`,
      headers,
    });
    expectHttpStatus(firstSubmit, 201);
    expectHttpStatus(secondSubmit, 201);
    expect(firstSubmit.json()).toMatchObject({ id: firstAttempt.id, status: 'SUBMITTED' });
    expect(secondSubmit.json()).toMatchObject({ id: firstAttempt.id, status: 'SUBMITTED' });

    expect(
      await prisma.assessmentAttemptResult.count({ where: { attemptId: firstAttempt.id } }),
    ).toBe(1);
    expect(
      await prisma.auditRecord.count({
        where: { targetId: firstAttempt.id, action: 'assessment.attempt.submitted' },
      }),
    ).toBe(1);
    expect(
      await prisma.outboxMessage.count({ where: { eventName: 'assessment.attempt.submitted' } }),
    ).toBe(1);
  });

  it('rejects expired submit attempts and persists the expired state', async () => {
    const { assessmentId } = await createPublishedAssessment();
    const started = await startAttempt(assessmentId);
    const boundary = new Date(Date.now() - 1000);

    await prisma.assessmentAttempt.update({
      where: { id: started.id },
      data: { expiresAt: boundary, updatedAt: boundary },
    });
    await prisma.assessmentAttemptSession.update({
      where: { attemptId: started.id },
      data: { expiresAt: boundary },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${started.id}/submit`,
      headers,
    });
    expectHttpStatus(response, 400);

    const expiredAttempt = await prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id: started.id },
    });
    expect(expiredAttempt.status).toBe('EXPIRED');
  });

  it('cancels an in-progress attempt', async () => {
    const { assessmentId } = await createPublishedAssessment();
    const started = await startAttempt(assessmentId);

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${started.id}/cancel`,
      headers,
    });
    expectHttpStatus(cancelRes, 201);
    expect(cancelRes.json()).toMatchObject({ id: started.id, status: 'CANCELLED' });
  });

  it('blocks cross-workspace reads and mutations', async () => {
    const { assessmentId, questionId, optionId } = await createPublishedAssessment();
    const started = await startAttempt(assessmentId);
    const otherWorkspaceHeaders = {
      ...headers,
      'x-workspace-id': '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    };

    const crossRead = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${started.id}`,
      headers: otherWorkspaceHeaders,
    });
    expectHttpStatus(crossRead, 404);

    const crossSave = await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${started.id}/answers/${questionId}`,
      headers: otherWorkspaceHeaders,
      payload: {
        questionId,
        questionKind: 'MCQ',
        answer: { selectedOptionId: optionId },
      },
    });
    expectHttpStatus(crossSave, 404);

    const crossSnapshotRead = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${started.id}/snapshot`,
      headers: otherWorkspaceHeaders,
    });
    expectHttpStatus(crossSnapshotRead, 404);
  });

  it('prevents a different learner in the same workspace from reading the snapshot route', async () => {
    const { assessmentId } = await createPublishedAssessment();
    const started = await startAttempt(assessmentId);
    const otherLearnerHeaders = {
      ...headers,
      'x-actor-id': '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    };

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${started.id}/snapshot`,
      headers: otherLearnerHeaders,
    });

    expectHttpStatus(response, 403);
  });

  it('fails when request context is missing', async () => {
    const { assessmentId } = await createPublishedAssessment();
    const response = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessmentId}/attempts`,
      headers: {
        'x-request-id': headers['x-request-id'],
        'x-correlation-id': headers['x-correlation-id'],
      },
    });

    expect([400, 401]).toContain(response.statusCode);
  });
});
