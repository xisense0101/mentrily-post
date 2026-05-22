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

describe('Media Security and Lifecycle Integration', () => {
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

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('enqueues a security scan job when upload is completed', async () => {
    // 1. Create upload intent
    const intentRes = await app.inject({
      method: 'POST',
      url: '/workspace/media/upload-intents',
      headers,
      payload: {
        filename: 'document.pdf',
        contentType: 'application/pdf',
        fileCategory: 'DOCUMENT',
        maxSizeBytes: 1024,
      },
    });
    expect(intentRes.statusCode).toBe(201);
    const intent = intentRes.json<{ id: string; assetId: string }>();

    // 2. Complete the upload
    const completeRes = await app.inject({
      method: 'POST',
      url: `/workspace/media/upload-intents/${intent.id}/complete`,
      headers,
      payload: { sizeBytes: 256 },
    });
    expect(completeRes.statusCode).toBe(201);

    // 3. Verify scan job was enqueued in database
    const scanJobs = await prisma.mediaSecurityScanJob.findMany({
      where: { mediaAssetId: intent.assetId },
    });
    expect(scanJobs).toHaveLength(1);
    expect(scanJobs[0].status).toBe('QUEUED');
    expect(scanJobs[0].idempotencyKey).toBe(`media-scan-${intent.assetId}`);

    // 4. Verify asset scanStatus is SCAN_QUEUED
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: intent.assetId },
    });
    expect(asset?.scanStatus).toBe('SCAN_QUEUED');
  });

  it('enforces scanStatus restrictions on read URL generation', async () => {
    // 1. Create upload intent
    const intentRes = await app.inject({
      method: 'POST',
      url: '/workspace/media/upload-intents',
      headers,
      payload: {
        filename: 'clean.pdf',
        contentType: 'application/pdf',
        fileCategory: 'DOCUMENT',
        maxSizeBytes: 1024,
      },
    });
    const intent = intentRes.json<{ id: string; assetId: string }>();

    // 2. Complete the upload
    await app.inject({
      method: 'POST',
      url: `/workspace/media/upload-intents/${intent.id}/complete`,
      headers,
      payload: { sizeBytes: 256 },
    });

    // Artificially transition asset to AVAILABLE (but scanStatus is SCAN_QUEUED)
    await prisma.mediaAsset.update({
      where: { id: intent.assetId },
      data: { status: 'AVAILABLE', scanStatus: 'SCAN_QUEUED' },
    });

    // 3. Try to get read URL - should fail since scanStatus is SCAN_QUEUED (in progress)
    const resQueued = await app.inject({
      method: 'POST',
      url: `/workspace/media/assets/${intent.assetId}/read-url`,
      headers,
    });
    expect(resQueued.statusCode).toBe(409);

    // 4. Update scanStatus to QUARANTINED
    await prisma.mediaAsset.update({
      where: { id: intent.assetId },
      data: { scanStatus: 'QUARANTINED' },
    });

    const resQuarantined = await app.inject({
      method: 'POST',
      url: `/workspace/media/assets/${intent.assetId}/read-url`,
      headers,
    });
    expect(resQuarantined.statusCode).toBe(403);

    // 5. Update scanStatus to SCAN_FAILED
    await prisma.mediaAsset.update({
      where: { id: intent.assetId },
      data: { scanStatus: 'SCAN_FAILED' },
    });

    const resFailed = await app.inject({
      method: 'POST',
      url: `/workspace/media/assets/${intent.assetId}/read-url`,
      headers,
    });
    expect(resFailed.statusCode).toBe(409);

    // 6. Update scanStatus to CLEAN
    await prisma.mediaAsset.update({
      where: { id: intent.assetId },
      data: { scanStatus: 'CLEAN' },
    });

    const resClean = await app.inject({
      method: 'POST',
      url: `/workspace/media/assets/${intent.assetId}/read-url`,
      headers,
    });
    expect(resClean.statusCode).toBe(201);
  });
});
