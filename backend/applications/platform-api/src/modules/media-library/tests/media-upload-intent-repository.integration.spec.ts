import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { PrismaMediaAssetRepository } from '../infrastructure/persistence/prisma/prisma-media-asset.repository.js';
import { PrismaMediaUploadIntentRepository } from '../infrastructure/persistence/prisma/prisma-media-upload-intent.repository.js';
import { MediaAsset, MediaUploadIntent } from '../domain/entities/index.js';

describe('PrismaMediaUploadIntentRepository (integration)', () => {
  let prisma: PrismaService;
  let assetRepo: PrismaMediaAssetRepository;
  let repo: PrismaMediaUploadIntentRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    assetRepo = new PrismaMediaAssetRepository(prisma);
    repo = new PrismaMediaUploadIntentRepository(prisma);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  it('saves and loads upload intent', async () => {
    const asset = MediaAsset.createPending({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '33333333-3333-4333-8333-333333333333',
      ownerPrincipalId: '44444444-4444-4444-8444-444444444444',
      filename: 'file.pdf',
      contentType: 'application/pdf',
      fileCategory: 'DOCUMENT',
      storageProvider: 'FIXTURE',
      objectKey:
        'tenants/22222222-2222-4222-8222-222222222222/workspaces/33333333-3333-4333-8333-333333333333/media/11111111-1111-4111-8111-111111111111/file.pdf',
    });
    await assetRepo.save(asset);

    const intent = MediaUploadIntent.create({
      id: '55555555-5555-4555-8555-555555555555',
      tenantId: asset.tenantId,
      workspaceId: asset.workspaceId,
      assetId: asset.id,
      ownerPrincipalId: asset.ownerPrincipalId,
      objectKey: asset.objectKey,
      contentType: asset.contentType,
      filename: asset.filename,
      fileCategory: asset.fileCategory,
      maxSizeBytes: 1000,
      uploadUrl: 'https://fixture',
      uploadMethod: 'PUT',
      headers: {},
      expiresAt: new Date(Date.now() + 10000),
    });
    await repo.save(intent);
    const loaded = await repo.findById(intent.id);
    expect(loaded?.id).toBe(intent.id);
  });
});
