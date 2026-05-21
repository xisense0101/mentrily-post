import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { PrismaMediaAssetRepository } from '../infrastructure/persistence/prisma/prisma-media-asset.repository.js';
import { MediaAsset } from '../domain/entities/index.js';

describe('PrismaMediaAssetRepository (integration)', () => {
  let prisma: PrismaService;
  let repo: PrismaMediaAssetRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repo = new PrismaMediaAssetRepository(prisma);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  it('saves and loads asset', async () => {
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
    await repo.save(asset);
    const loaded = await repo.findById(asset.id);
    expect(loaded?.id).toBe(asset.id);
  });
});
