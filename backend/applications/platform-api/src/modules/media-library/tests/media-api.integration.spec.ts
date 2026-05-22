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
import {
  FixtureObjectStorageAdapter,
  OBJECT_STORAGE_PORT,
} from '../infrastructure/storage/index.js';

describe('Media Library API (integration)', () => {
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
          operation({ transactionId: randomUUID(), client: tx }),
        ) as Promise<T>;
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_EVALUATOR)
      .useValue(permissionEvaluator)
      .overrideProvider(TRANSACTION_RUNNER)
      .useValue(transactionRunner)
      .overrideProvider(OBJECT_STORAGE_PORT)
      .useValue(new FixtureObjectStorageAdapter())
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

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('create upload intent, complete upload, list asset, get asset, read url, archive asset', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/media/upload-intents',
      headers,
      payload: {
        filename: 'file.pdf',
        contentType: 'application/pdf',
        fileCategory: 'DOCUMENT',
        maxSizeBytes: 1024,
      },
    });
    expectHttpStatus(createRes, 201);
    const created = createRes.json<{ id: string; assetId: string }>();

    const completeRes = await app.inject({
      method: 'POST',
      url: `/workspace/media/upload-intents/${created.id}/complete`,
      headers,
      payload: { sizeBytes: 500 },
    });
    expectHttpStatus(completeRes, 201);

    await prisma.mediaAsset.update({
      where: { id: created.assetId },
      data: { status: 'AVAILABLE', scanStatus: 'CLEAN' },
    });

    const listRes = await app.inject({ method: 'GET', url: '/workspace/media/assets', headers });
    expectHttpStatus(listRes, 200);
    expect(listRes.json()).toHaveLength(1);
    expect(listRes.body).not.toContain('objectKey');

    const filteredListRes = await app.inject({
      method: 'GET',
      url: '/workspace/media/assets?fileCategory=DOCUMENT',
      headers,
    });
    expectHttpStatus(filteredListRes, 200);
    expect(filteredListRes.json()).toHaveLength(1);

    const getRes = await app.inject({
      method: 'GET',
      url: `/workspace/media/assets/${created.assetId}`,
      headers,
    });
    expectHttpStatus(getRes, 200);
    expect(getRes.body).not.toContain('objectKey');

    const readRes = await app.inject({
      method: 'POST',
      url: `/workspace/media/assets/${created.assetId}/read-url`,
      headers,
    });
    expectHttpStatus(readRes, 201);

    const archiveRes = await app.inject({
      method: 'POST',
      url: `/workspace/media/assets/${created.assetId}/archive`,
      headers,
    });
    expectHttpStatus(archiveRes, 201);

    const readDenied = await app.inject({
      method: 'POST',
      url: `/workspace/media/assets/${created.assetId}/read-url`,
      headers,
    });
    expectHttpStatus(readDenied, 409);
  });
});
