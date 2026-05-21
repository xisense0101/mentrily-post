import { describe, expect, it } from 'vitest';
import type { MediaAssetContract } from '../types';
import {
  createUploadQueueItem,
  formatMediaFileSize,
  inferMediaFileCategory,
  isPreviewableMediaAsset,
  updateUploadQueueItemProgress,
  validateMediaFileForUpload,
} from '../state';

function makeAsset(overrides: Partial<MediaAssetContract> = {}): MediaAssetContract {
  return {
    id: 'asset_1',
    ownerPrincipalId: 'principal_1',
    filename: 'example.png',
    contentType: 'image/png',
    fileCategory: 'IMAGE',
    sizeBytes: 1024,
    checksumSha256: 'hash',
    storageProvider: 'FIXTURE',
    objectKey: 'media/example.png',
    visibility: 'PRIVATE',
    status: 'AVAILABLE',
    metadata: {},
    createdAt: '2026-05-21T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('media-library-state', () => {
  it('infers category from mime type and extension', () => {
    expect(inferMediaFileCategory({ file: { name: 'photo.png', type: 'image/png' } as File })).toBe('IMAGE');
    expect(inferMediaFileCategory({ file: { name: 'report.pdf', type: '' } as File })).toBe('DOCUMENT');
  });

  it('formats file size', () => {
    expect(formatMediaFileSize(1024)).toBe('1.0 KB');
    expect(formatMediaFileSize(0)).toBe('0 B');
  });

  it('validates category and size', () => {
    const valid = validateMediaFileForUpload({
      file: { name: 'audio.mp3', size: 50, type: 'audio/mpeg' } as File,
      allowedCategories: ['AUDIO'],
      maxSizeBytes: 100,
    });
    expect(valid.valid).toBe(true);

    const invalid = validateMediaFileForUpload({
      file: { name: 'archive.zip', size: 150, type: 'application/zip' } as File,
      allowedCategories: ['DOCUMENT'],
      maxSizeBytes: 100,
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.message).toBeTruthy();
  });

  it('detects previewable assets safely', () => {
    expect(isPreviewableMediaAsset(makeAsset())).toBe(true);
    expect(isPreviewableMediaAsset(makeAsset({ status: 'PENDING_UPLOAD' }))).toBe(false);
    expect(isPreviewableMediaAsset(makeAsset({ archivedAt: '2026-05-21T01:00:00.000Z' }))).toBe(false);
  });

  it('updates queue progress without converting files', () => {
    const file = new File(['abc'], 'note.txt', { type: 'text/plain' });
    const item = createUploadQueueItem(file);
    const updated = updateUploadQueueItemProgress({ item, loadedBytes: 2, totalBytes: 4 });
    expect(updated.progress.percent).toBe(50);
    expect(updated.file).toBe(file);
  });
});
