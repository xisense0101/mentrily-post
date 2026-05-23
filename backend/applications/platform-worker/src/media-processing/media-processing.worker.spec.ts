import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaProcessingWorker } from './media-processing.worker.js';

describe('MediaProcessingWorker', () => {
  let worker: MediaProcessingWorker;
  let prismaMock: {
    $transaction: ReturnType<typeof vi.fn>;
    mediaAsset: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    mediaRendition: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    const txMock = {
      mediaProcessingJob: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
      mediaAsset: {
        update: vi.fn(),
      },
    };

    prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) =>
          callback(txMock),
        ),
      mediaAsset: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      mediaRendition: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    worker = new MediaProcessingWorker(
      prismaMock as never,
      { extractMetadata: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }) } as never,
      {
        generateRendition: vi.fn().mockResolvedValue({
          kind: 'THUMBNAIL',
          mimeType: 'image/jpeg',
          sizeBytes: 512,
          width: 320,
          height: 240,
          tempFilePath: '/tmp/thumb.jpg',
        }),
      } as never,
    );
  });

  it('processes clean image assets with IMAGE_STANDARD template', async () => {
    const asset = {
      id: 'asset-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      filename: 'image.png',
      contentType: 'image/png',
      fileCategory: 'IMAGE',
      sizeBytes: BigInt(1024),
      checksumSha256: 'abc',
      storageProvider: 'FIXTURE',
      objectKey: 'tenant-1/workspace-1/image.png',
      visibility: 'PRIVATE',
      status: 'PROCESSING_QUEUED',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      scanStatus: 'CLEAN',
      scannedAt: new Date(),
      scanErrorCode: null,
      scanErrorMessage: null,
      quarantineReason: null,
      quarantinedAt: null,
      deleteAfter: null,
      deletedAt: null,
    };

    const tx = await prismaMock.$transaction.mock.results[0]?.value;
    void tx;
    prismaMock.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        mediaProcessingJob: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              {
                id: 'job-1',
                mediaAssetId: 'asset-1',
                jobType: 'METADATA_EXTRACTION',
                attempts: 0,
                maxAttempts: 3,
              },
            ]),
          updateMany: vi.fn(),
          update: vi.fn(),
        },
        mediaAsset: { update: vi.fn() },
      } as never),
    );
    prismaMock.mediaAsset.findUnique.mockResolvedValue(asset);
    prismaMock.mediaRendition.findFirst.mockResolvedValue(null);

    const result = await worker.runOnce(1);

    expect(result).toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(prismaMock.mediaRendition.create).toHaveBeenCalled();
  });
});
