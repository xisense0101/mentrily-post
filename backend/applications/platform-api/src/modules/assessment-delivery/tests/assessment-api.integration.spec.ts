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

describe('Assessment Delivery API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const headers = {
    'x-request-id': '11111111-1111-4111-8111-111111111111',
    'x-correlation-id': '22222222-2222-4222-8222-222222222222',
    'x-tenant-id': '33333333-3333-4333-8333-333333333333',
    'x-workspace-id': '44444444-4444-4444-8444-444444444444',
    'x-actor-id': '55555555-5555-4555-8555-555555555555',
  } as const;

  beforeAll(async () => {
    const prismaRef: { current: PrismaService | undefined } = { current: undefined };
    const permissionEvaluator: PermissionEvaluator = { evaluate: async () => ({ allowed: true }) };
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

  async function createDraftAssessment() {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/assessments',
      headers,
      payload: { title: 'Initial Quiz', purpose: 'QUIZ' },
    });
    expectHttpStatus(createRes, 201);
    const created = createRes.json<{ id: string }>();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const persisted = await prisma.assessment.findUnique({
        where: { id: created.id },
        select: { id: true },
      });
      if (persisted) {
        return created;
      }
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }

    throw new Error(`Assessment ${created.id} was not visible after create`);
  }

  async function truncateWithRetry(): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await truncatePublicSchema(prisma);
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('40P01')) throw error;
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

  it('creator can create draft assessment', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/assessments',
      headers,
      payload: { title: 'My Quiz', purpose: 'QUIZ' },
    });
    expectHttpStatus(createRes, 201);
    expect(createRes.json()).toMatchObject({ title: 'My Quiz', purpose: 'QUIZ', status: 'DRAFT' });
  });

  it('creator can list assessments', async () => {
    await createDraftAssessment();
    const listRes = await app.inject({ method: 'GET', url: '/workspace/assessments', headers });
    expectHttpStatus(listRes, 200);
    expect(listRes.json()).toHaveLength(1);
  });

  it('creator can read one assessment', async () => {
    const created = await createDraftAssessment();
    const getRes = await app.inject({
      method: 'GET',
      url: `/workspace/assessments/${created.id}`,
      headers,
    });
    expectHttpStatus(getRes, 200);
    expect(getRes.json()).toMatchObject({ id: created.id, title: 'Initial Quiz' });
  });

  it('creator can update assessment settings', async () => {
    const created = await createDraftAssessment();
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/workspace/assessments/${created.id}`,
      headers,
      payload: { title: 'Renamed Quiz', visibility: 'PRIVATE' },
    });
    expectHttpStatus(updateRes, 200);
    expect(updateRes.json()).toMatchObject({
      id: created.id,
      title: 'Renamed Quiz',
      visibility: 'PRIVATE',
    });
  });

  it('creator can replace content', async () => {
    const created = await createDraftAssessment();
    const replaceRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessments/${created.id}/content`,
      headers,
      payload: {
        sections: [
          {
            id: '11111111-1111-4111-8111-111111111121',
            title: 'S1',
            position: 0,
            questions: [
              {
                id: '11111111-1111-4111-8111-111111111122',
                kind: 'MCQ',
                title: 'Q1',
                prompt: { text: 'Q1' },
                options: [
                  {
                    id: '11111111-1111-4111-8111-111111111123',
                    label: 'A',
                    value: 'a',
                    isCorrect: true,
                  },
                  {
                    id: '11111111-1111-4111-8111-111111111124',
                    label: 'B',
                    value: 'b',
                    isCorrect: false,
                  },
                ],
                answerKey: { correctOptionIds: ['11111111-1111-4111-8111-111111111123'] },
                points: 1,
                gradingMode: 'AUTO',
                position: 0,
              },
            ],
          },
        ],
        looseQuestions: [],
      },
    });
    expectHttpStatus(replaceRes, 200);
    expect(replaceRes.json().currentDraftVersion.sections).toHaveLength(1);
  });

  it('creator can publish assessment', async () => {
    const created = await createDraftAssessment();
    // Must add content first
    await app.inject({
      method: 'PUT',
      url: `/workspace/assessments/${created.id}/content`,
      headers,
      payload: {
        sections: [],
        looseQuestions: [
          {
            id: '11111111-1111-4111-8111-111111111125',
            kind: 'MCQ',
            title: 'Q1',
            prompt: { text: 'Q1' },
            options: [
              {
                id: '11111111-1111-4111-8111-111111111126',
                label: 'A',
                value: 'a',
                isCorrect: true,
              },
              {
                id: '11111111-1111-4111-8111-111111111127',
                label: 'B',
                value: 'b',
                isCorrect: false,
              },
            ],
            answerKey: { correctOptionIds: ['11111111-1111-4111-8111-111111111126'] },
            points: 1,
            gradingMode: 'AUTO',
            position: 0,
          },
        ],
      },
    });

    const publishRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${created.id}/publish`,
      headers,
    });
    expectHttpStatus(publishRes, 201);
    expect(publishRes.json()).toMatchObject({ id: created.id, status: 'PUBLISHED' });
  });

  it('creator can fetch latest snapshot', async () => {
    const created = await createDraftAssessment();
    await app.inject({
      method: 'PUT',
      url: `/workspace/assessments/${created.id}/content`,
      headers,
      payload: {
        sections: [],
        looseQuestions: [
          {
            id: '11111111-1111-4111-8111-111111111128',
            kind: 'MCQ',
            title: 'Q1',
            prompt: { text: 'Q1' },
            options: [
              {
                id: '11111111-1111-4111-8111-111111111129',
                label: 'A',
                value: 'a',
                isCorrect: true,
              },
              {
                id: '11111111-1111-4111-8111-111111111130',
                label: 'B',
                value: 'b',
                isCorrect: false,
              },
            ],
            answerKey: { correctOptionIds: ['11111111-1111-4111-8111-111111111129'] },
            points: 1,
            gradingMode: 'AUTO',
            position: 0,
          },
        ],
      },
    });
    await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${created.id}/publish`,
      headers,
    });

    const snapshotRes = await app.inject({
      method: 'GET',
      url: `/workspace/assessments/${created.id}/snapshots/latest`,
      headers,
    });
    expectHttpStatus(snapshotRes, 200);
    expect(snapshotRes.json()).toMatchObject({ assessmentId: created.id, versionNumber: 1 });
  });

  it('creator can archive and restore assessment', async () => {
    const created = await createDraftAssessment();

    // Archive
    const archiveRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${created.id}/archive`,
      headers,
    });
    expectHttpStatus(archiveRes, 201);
    expect(archiveRes.json()).toMatchObject({ id: created.id, status: 'ARCHIVED' });

    // Restore
    const restoreRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${created.id}/restore`,
      headers,
    });
    expectHttpStatus(restoreRes, 201);
    expect(restoreRes.json()).toMatchObject({ id: created.id, status: 'DRAFT' });
  });

  it('cross-workspace read fails as not found', async () => {
    const created = await createDraftAssessment();
    const crossRead = await app.inject({
      method: 'GET',
      url: `/workspace/assessments/${created.id}`,
      headers: {
        ...headers,
        'x-workspace-id': '99999999-9999-4999-8999-999999999999',
      },
    });
    expectHttpStatus(crossRead, 404);
  });
});
