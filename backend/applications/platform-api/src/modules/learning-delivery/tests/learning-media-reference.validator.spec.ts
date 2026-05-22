import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { RequestContext } from '@mentrily/service-core';
import { MediaAssetRepository } from '../../media-library/domain/repositories/index.js';
import { validateLearningMediaReference } from '../application/support/learning-media-reference.validator.js';
import { LearningContentKind } from '../domain/value-objects/learning-content-kind.vo.js';

describe('validateLearningMediaReference', () => {
  const context: RequestContext = {
    requestId: 'req-1',
    correlationId: 'cor-1',
    timestamp: new Date().toISOString(),
    workspace: { tenantId: 'tenant-1', workspaceId: 'workspace-1', actorId: 'actor-1' },
  };

  it('allows empty contentRef', async () => {
    const repo = {} as unknown as MediaAssetRepository;
    await expect(
      validateLearningMediaReference(repo, context, {
        title: 'Lesson',
        kind: LearningContentKind.TEXT,
        contentRef: '',
      }),
    ).resolves.not.toThrow();
  });

  it('allows non-UUID URL contentRef for non-media kinds', async () => {
    const repo = {} as unknown as MediaAssetRepository;
    await expect(
      validateLearningMediaReference(repo, context, {
        title: 'Lesson',
        kind: LearningContentKind.TEXT,
        contentRef: 'https://example.com',
      }),
    ).resolves.not.toThrow();
  });

  it('rejects non-UUID contentRef for media kinds', async () => {
    const repo = {} as unknown as MediaAssetRepository;
    await expect(
      validateLearningMediaReference(repo, context, {
        title: 'Lesson',
        kind: LearningContentKind.VIDEO,
        contentRef: 'https://example.com/video.mp4',
      }),
    ).rejects.toThrow(/requires a valid MediaAsset ID as contentRef/);
  });

  it('rejects if asset does not exist', async () => {
    const repo = {
      findById: vi.fn(async () => null),
    } as unknown as MediaAssetRepository;

    const assetId = randomUUID();
    await expect(
      validateLearningMediaReference(repo, context, {
        title: 'Lesson',
        kind: LearningContentKind.VIDEO,
        contentRef: assetId,
      }),
    ).rejects.toThrow(/referenced media asset not found/);
  });

  it('rejects if asset belongs to another workspace', async () => {
    const asset = {
      id: randomUUID(),
      tenantId: 'tenant-2',
      workspaceId: 'workspace-2',
      status: 'AVAILABLE',
      fileCategory: 'VIDEO',
    };
    const repo = {
      findById: vi.fn(async () => asset),
    } as unknown as MediaAssetRepository;

    await expect(
      validateLearningMediaReference(repo, context, {
        title: 'Lesson',
        kind: LearningContentKind.VIDEO,
        contentRef: asset.id,
      }),
    ).rejects.toThrow(/does not belong to this workspace/);
  });

  it('rejects if asset is not AVAILABLE', async () => {
    const asset = {
      id: randomUUID(),
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      status: 'PENDING_UPLOAD',
      fileCategory: 'VIDEO',
    };
    const repo = {
      findById: vi.fn(async () => asset),
    } as unknown as MediaAssetRepository;

    await expect(
      validateLearningMediaReference(repo, context, {
        title: 'Lesson',
        kind: LearningContentKind.VIDEO,
        contentRef: asset.id,
      }),
    ).rejects.toThrow(/referenced media asset is not available/);
  });

  it('rejects if VIDEO lesson references a non-VIDEO asset', async () => {
    const asset = {
      id: randomUUID(),
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      status: 'AVAILABLE',
      fileCategory: 'DOCUMENT',
    };
    const repo = {
      findById: vi.fn(async () => asset),
    } as unknown as MediaAssetRepository;

    await expect(
      validateLearningMediaReference(repo, context, {
        title: 'Lesson',
        kind: LearningContentKind.VIDEO,
        contentRef: asset.id,
      }),
    ).rejects.toThrow(/VIDEO lesson requires a VIDEO media asset/);
  });

  it('allows valid media asset reference', async () => {
    const asset = {
      id: randomUUID(),
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      status: 'AVAILABLE',
      fileCategory: 'VIDEO',
    };
    const repo = {
      findById: vi.fn(async () => asset),
    } as unknown as MediaAssetRepository;

    await expect(
      validateLearningMediaReference(repo, context, {
        title: 'Lesson',
        kind: LearningContentKind.VIDEO,
        contentRef: asset.id,
      }),
    ).resolves.not.toThrow();
  });
});
