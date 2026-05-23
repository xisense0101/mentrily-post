import { describe, expect, it } from 'vitest';
import { resolveMediaProcessingTemplate } from '../application/support/media-processing-template.resolver.js';
import type { MediaAsset } from '../domain/entities/media-asset.entity.js';

function makeAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: 'asset-1',
    tenantId: 'tenant-1',
    workspaceId: 'workspace-1',
    ownerPrincipalId: 'owner-1',
    filename: 'sample.png',
    contentType: 'image/png',
    fileCategory: 'IMAGE',
    storageProvider: 'FIXTURE',
    objectKey: 'tenant-1/workspace-1/sample.png',
    visibility: 'PRIVATE',
    status: 'PROCESSING',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    scanStatus: 'CLEAN',
    canBeReadBy: () => false,
    ...overrides,
  } as MediaAsset;
}

describe('resolveMediaProcessingTemplate', () => {
  it('resolves image template for image assets', () => {
    expect(resolveMediaProcessingTemplate(makeAsset()).key).toBe('IMAGE_STANDARD');
  });

  it('resolves video reserved template for video assets', () => {
    expect(
      resolveMediaProcessingTemplate(
        makeAsset({ contentType: 'video/mp4', fileCategory: 'VIDEO', filename: 'sample.mp4' }),
      ).key,
    ).toBe('VIDEO_RESERVED_STANDARD');
  });

  it('falls back to generic template for other assets', () => {
    expect(
      resolveMediaProcessingTemplate(
        makeAsset({
          contentType: 'application/octet-stream',
          fileCategory: 'OTHER',
          filename: 'sample.bin',
        }),
      ).key,
    ).toBe('GENERIC_FILE_STANDARD');
  });
});
