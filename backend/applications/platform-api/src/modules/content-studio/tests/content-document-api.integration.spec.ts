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

describe('Content Studio API (integration)', () => {
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
    let prismaRef: PrismaService | undefined;
    const permissionEvaluator: PermissionEvaluator = { evaluate: async () => ({ allowed: true }) };
    const transactionRunner: TransactionRunner = {
      run: async <T>(operation: Parameters<TransactionRunner['run']>[0]): Promise<T> => {
        if (!prismaRef) throw new Error('prismaRef not initialized');
        return prismaRef.$transaction(async (tx) =>
          operation({ transactionId: 'tx-content-api-test', client: tx }),
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

  async function createDraftDocument() {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/content/documents',
      headers,
      payload: { title: 'Doc', purpose: 'COURSE_CONTENT' },
    });
    expectHttpStatus(createRes, 201);
    return createRes.json<{ id: string }>();
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

  it('creator can create draft document', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/content/documents',
      headers,
      payload: { title: 'Doc', purpose: 'COURSE_CONTENT' },
    });
    expectHttpStatus(createRes, 201);
    expect(createRes.json()).toMatchObject({
      title: 'Doc',
      purpose: 'COURSE_CONTENT',
      status: 'DRAFT',
    });
  });

  it('creator can list documents', async () => {
    await createDraftDocument();
    const listRes = await app.inject({
      method: 'GET',
      url: '/workspace/content/documents',
      headers,
    });
    expectHttpStatus(listRes, 200);
    expect(listRes.json()).toHaveLength(1);
  });

  it('creator can read one document', async () => {
    const created = await createDraftDocument();
    const getRes = await app.inject({
      method: 'GET',
      url: `/workspace/content/documents/${created.id}`,
      headers,
    });
    expectHttpStatus(getRes, 200);
    expect(getRes.json()).toMatchObject({ id: created.id, title: 'Doc' });
  });

  it('creator can update document title', async () => {
    const created = await createDraftDocument();
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/workspace/content/documents/${created.id}`,
      headers,
      payload: { title: 'Renamed Doc' },
    });
    expectHttpStatus(updateRes, 200);
    expect(updateRes.json()).toMatchObject({ id: created.id, title: 'Renamed Doc' });
  });

  it('creator can replace blocks', async () => {
    const created = await createDraftDocument();
    const replaceRes = await app.inject({
      method: 'PUT',
      url: `/workspace/content/documents/${created.id}/blocks`,
      headers,
      payload: {
        blocks: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            kind: 'HEADING',
            position: 0,
            path: '0',
            content: { text: 'Hello' },
          },
        ],
      },
    });
    expectHttpStatus(replaceRes, 200);
    expect(replaceRes.json()).toMatchObject({
      id: created.id,
      currentDraftVersion: {
        blocks: [{ kind: 'HEADING', path: '0' }],
      },
    });
  });

  it('creator can publish document', async () => {
    const created = await createDraftDocument();
    await app.inject({
      method: 'PUT',
      url: `/workspace/content/documents/${created.id}/blocks`,
      headers,
      payload: {
        blocks: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            kind: 'PARAGRAPH',
            position: 0,
            path: '0',
            content: { text: 'Hello' },
          },
        ],
      },
    });
    const publishRes = await app.inject({
      method: 'POST',
      url: `/workspace/content/documents/${created.id}/publish`,
      headers,
      payload: {},
    });
    expectHttpStatus(publishRes, 201);
    expect(publishRes.json()).toMatchObject({ id: created.id, status: 'PUBLISHED' });
  });

  it('creator can fetch latest snapshot', async () => {
    const created = await createDraftDocument();
    await app.inject({
      method: 'PUT',
      url: `/workspace/content/documents/${created.id}/blocks`,
      headers,
      payload: {
        blocks: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            kind: 'PARAGRAPH',
            position: 0,
            path: '0',
            content: { text: 'Hello' },
          },
        ],
      },
    });
    await app.inject({
      method: 'POST',
      url: `/workspace/content/documents/${created.id}/publish`,
      headers,
      payload: {},
    });
    const snapshotRes = await app.inject({
      method: 'GET',
      url: `/workspace/content/documents/${created.id}/snapshots/latest`,
      headers,
    });
    expectHttpStatus(snapshotRes, 200);
    expect(snapshotRes.json()).toMatchObject({ documentId: created.id, versionNumber: 1 });
  });

  it('creator can archive document', async () => {
    const created = await createDraftDocument();
    const archiveRes = await app.inject({
      method: 'POST',
      url: `/workspace/content/documents/${created.id}/archive`,
      headers,
    });
    expectHttpStatus(archiveRes, 201);
    expect(archiveRes.json()).toMatchObject({ id: created.id, status: 'ARCHIVED' });
  });

  it('creator can restore document to draft', async () => {
    const created = await createDraftDocument();
    await app.inject({
      method: 'POST',
      url: `/workspace/content/documents/${created.id}/archive`,
      headers,
    });
    const restoreRes = await app.inject({
      method: 'POST',
      url: `/workspace/content/documents/${created.id}/restore`,
      headers,
    });
    expectHttpStatus(restoreRes, 201);
    expect(restoreRes.json()).toMatchObject({ id: created.id, status: 'DRAFT' });
  });

  it('missing workspace context fails', async () => {
    const missingCtx = await app.inject({
      method: 'GET',
      url: '/workspace/content/documents',
      headers: {
        'x-request-id': headers['x-request-id'],
        'x-correlation-id': headers['x-correlation-id'],
      },
    });
    expectHttpStatus(missingCtx, 400);
  });

  it('cross-workspace read fails as not found', async () => {
    const created = await createDraftDocument();
    const crossRead = await app.inject({
      method: 'GET',
      url: `/workspace/content/documents/${created.id}`,
      headers: {
        ...headers,
        'x-workspace-id': '99999999-9999-4999-8999-999999999999',
      },
    });
    expectHttpStatus(crossRead, 404);
  });

  it('cross-workspace mutation fails as not found', async () => {
    const created = await createDraftDocument();
    const crossMutation = await app.inject({
      method: 'PATCH',
      url: `/workspace/content/documents/${created.id}`,
      headers: {
        ...headers,
        'x-workspace-id': '99999999-9999-4999-8999-999999999999',
      },
      payload: { title: 'Should Fail' },
    });
    expectHttpStatus(crossMutation, 404);
  });
});
