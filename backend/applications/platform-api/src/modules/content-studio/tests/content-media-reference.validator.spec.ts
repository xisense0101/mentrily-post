import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { RequestContext } from '@mentrily/service-core';
import { MediaAssetRepository } from '../../media-library/domain/repositories/index.js';
import { validateContentMediaReferences } from '../application/support/content-media-reference.validator.js';


describe('validateContentMediaReferences', () => {
  const context: RequestContext = {
    requestId: 'req-1',
    correlationId: 'cor-1',
    timestamp: new Date().toISOString(),
    workspace: { tenantId: 'tenant-1', workspaceId: 'workspace-1', actorId: 'actor-1' },
  };

  it('allows non-media block kinds', async () => {
    const repo = {} as unknown as MediaAssetRepository;
    await expect(
      validateContentMediaReferences(repo, context, [
        {
          id: 'block-1',
          kind: 'PARAGRAPH',
          position: 0,
          path: '0',
          content: { text: 'Hello' },
        },
      ]),
    ).resolves.not.toThrow();
  });

  it('allows media block kinds with empty contentRef / mediaAssetId', async () => {
    const repo = {} as unknown as MediaAssetRepository;
    await expect(
      validateContentMediaReferences(repo, context, [
        {
          id: 'block-1',
          kind: 'IMAGE',
          position: 0,
          path: '0',
          content: {},
        },
      ]),
    ).resolves.not.toThrow();
  });

  it('rejects if referenced media asset does not exist', async () => {
    const repo = {
      findById: vi.fn(async () => null),
    } as unknown as MediaAssetRepository;

    const assetId = randomUUID();
    await expect(
      validateContentMediaReferences(repo, context, [
        {
          id: 'block-1',
          kind: 'IMAGE',
          position: 0,
          path: '0',
          content: { mediaAssetId: assetId },
        },
      ]),
    ).rejects.toThrow(/referenced media asset not found/);
  });

  it('rejects if asset belongs to another workspace', async () => {
    const asset = {
      id: randomUUID(),
      tenantId: 'tenant-2',
      workspaceId: 'workspace-2',
      status: 'AVAILABLE',
      fileCategory: 'IMAGE',
    };
    const repo = {
      findById: vi.fn(async () => asset),
    } as unknown as MediaAssetRepository;

    await expect(
      validateContentMediaReferences(repo, context, [
        {
          id: 'block-1',
          kind: 'IMAGE',
          position: 0,
          path: '0',
          content: { mediaAssetId: asset.id },
        },
      ]),
    ).rejects.toThrow(/does not belong to this workspace/);
  });

  it('rejects if asset is not AVAILABLE', async () => {
    const asset = {
      id: randomUUID(),
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      status: 'PENDING_UPLOAD',
      fileCategory: 'IMAGE',
    };
    const repo = {
      findById: vi.fn(async () => asset),
    } as unknown as MediaAssetRepository;

    await expect(
      validateContentMediaReferences(repo, context, [
        {
          id: 'block-1',
          kind: 'IMAGE',
          position: 0,
          path: '0',
          content: { mediaAssetId: asset.id },
        },
      ]),
    ).rejects.toThrow(/referenced media asset is not available/);
  });

  it('rejects if IMAGE block references non-IMAGE asset', async () => {
    const asset = {
      id: randomUUID(),
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      status: 'AVAILABLE',
      scanStatus: 'CLEAN',
      fileCategory: 'VIDEO',
    };
    const repo = {
      findById: vi.fn(async () => asset),
    } as unknown as MediaAssetRepository;

    await expect(
      validateContentMediaReferences(repo, context, [
        {
          id: 'block-1',
          kind: 'IMAGE',
          position: 0,
          path: '0',
          content: { mediaAssetId: asset.id },
        },
      ]),
    ).rejects.toThrow(/IMAGE block requires an IMAGE media asset/);
  });

  it('rejects if VIDEO block references non-VIDEO asset', async () => {
    const asset = {
      id: randomUUID(),
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      status: 'AVAILABLE',
      scanStatus: 'CLEAN',
      fileCategory: 'IMAGE',
    };
    const repo = {
      findById: vi.fn(async () => asset),
    } as unknown as MediaAssetRepository;

    await expect(
      validateContentMediaReferences(repo, context, [
        {
          id: 'block-1',
          kind: 'VIDEO',
          position: 0,
          path: '0',
          content: { mediaAssetId: asset.id },
        },
      ]),
    ).rejects.toThrow(/VIDEO block requires a VIDEO media asset/);
  });

  it('allows valid media block references', async () => {
    const asset = {
      id: randomUUID(),
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      status: 'AVAILABLE',
      scanStatus: 'CLEAN',
      fileCategory: 'IMAGE',
    };
    const repo = {
      findById: vi.fn(async () => asset),
    } as unknown as MediaAssetRepository;

    await expect(
      validateContentMediaReferences(repo, context, [
        {
          id: 'block-1',
          kind: 'IMAGE',
          position: 0,
          path: '0',
          content: { mediaAssetId: asset.id },
        },
      ]),
    ).resolves.not.toThrow();
  });
});
