import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaLifecycleWorker } from './media-lifecycle.worker.js';

describe('MediaLifecycleWorker', () => {
  let worker: MediaLifecycleWorker;
  let txMock: any;
  let prismaMock: any;

  beforeEach(() => {
    txMock = {
      mediaLifecycleJob: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      mediaAsset: {
        findMany: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      mediaRendition: {
        deleteMany: vi.fn(),
      },
      outboxMessage: {
        create: vi.fn(),
      },
    };

    prismaMock = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(txMock)),
      mediaAsset: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
      },
      mediaLifecycleJob: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      learningLesson: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      contentBlock: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };

    worker = new MediaLifecycleWorker(prismaMock as any);
  });

  it('runs discovery routines and processes claimed delete jobs', async () => {
    // 1. Discovery mocks: expired uploads
    prismaMock.mediaAsset.findMany
      .mockResolvedValueOnce([{ id: 'expired-1', workspaceId: 'ws-1' }]) // uncompleted upload (PENDING_UPLOAD > 24h)
      .mockResolvedValueOnce([
        { id: 'deleted-item-1', workspaceId: 'ws-1', status: 'DELETE_QUEUED' },
      ]); // items to delete

    // 2. Claim & Processing mocks
    txMock.mediaLifecycleJob.findMany.mockResolvedValueOnce([
      {
        id: 'job-1',
        mediaAssetId: 'deleted-item-1',
        jobType: 'DELETE_ASSET',
        attempts: 0,
        maxAttempts: 3,
      },
    ]);
    prismaMock.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 'deleted-item-1',
      objectKey: 'origin-key',
      renditions: [{ id: 'rend-1', storageKey: 'rend-key' }],
    });

    const result = await worker.runOnce(10);

    expect(result).toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(txMock.mediaAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'expired-1' },
        data: { status: 'ABANDONED' },
      }),
    );
    expect(txMock.mediaRendition.deleteMany).toHaveBeenCalledWith({
      where: { mediaAssetId: 'deleted-item-1' },
    });
    expect(txMock.mediaAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'deleted-item-1' },
        data: expect.objectContaining({ status: 'DELETED' }),
      }),
    );
    expect(txMock.mediaLifecycleJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'SUCCEEDED' }),
      }),
    );
  });

  it('does not delete asset if it is actively referenced', async () => {
    // 1. Discovery mocks
    prismaMock.mediaAsset.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    // 2. Claim & Processing mocks
    txMock.mediaLifecycleJob.findMany.mockResolvedValueOnce([
      {
        id: 'job-2',
        mediaAssetId: 'referenced-item-1',
        jobType: 'DELETE_ASSET',
        attempts: 0,
        maxAttempts: 3,
      },
    ]);
    prismaMock.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 'referenced-item-1',
      objectKey: 'origin-key',
      renditions: [],
    });

    // Mock that asset is referenced in LearningLesson
    prismaMock.learningLesson.findFirst.mockResolvedValueOnce({ id: 'lesson-1' });

    const result = await worker.runOnce(10);

    expect(result).toEqual({ claimed: 1, processed: 1, failed: 0 });
    // Should NOT call delete or update status to DELETED
    expect(txMock.mediaAsset.update).not.toHaveBeenCalled();
    expect(txMock.mediaRendition.deleteMany).not.toHaveBeenCalled();

    // Should fail the job with ASSET_REFERENCED code
    expect(prismaMock.mediaLifecycleJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-2' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorCode: 'ASSET_REFERENCED',
        }),
      }),
    );
  });
});
