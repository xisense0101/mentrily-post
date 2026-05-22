import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaProcessingWorker } from './media-processing.worker.js';

describe('MediaProcessingWorker', () => {
  let worker: MediaProcessingWorker;
  let txMock: any;
  let prismaMock: any;

  beforeEach(() => {
    txMock = {
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
      $transaction: vi.fn().mockImplementation(async (cb) => cb(txMock)),
    };

    worker = new MediaProcessingWorker(prismaMock);
  });

  it('claims jobs and processes them successfully', async () => {
    txMock.mediaProcessingJob.findMany
      .mockResolvedValueOnce([{ id: 'job-1', mediaAssetId: 'asset-1', jobType: 'METADATA_EXTRACTION', attempts: 0, maxAttempts: 3 }])
      .mockResolvedValueOnce([]); // Evaluate asset status call

    const result = await worker.runOnce(10);

    expect(result).toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(txMock.mediaProcessingJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PROCESSING' }),
      }),
    );
    expect(txMock.mediaProcessingJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: { status: 'SUCCEEDED', lockedAt: null, lockedBy: null },
      }),
    );
    expect(txMock.mediaAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { status: 'AVAILABLE' },
    });
  });

  it('marks job as RETRYING on failure', async () => {
    txMock.mediaProcessingJob.findMany
      .mockResolvedValueOnce([{ id: 'job-1', mediaAssetId: 'asset-1', jobType: 'METADATA_EXTRACTION', attempts: 0, maxAttempts: 3 }])
      .mockResolvedValueOnce([{ status: 'RETRYING' }]); // Evaluate asset status call

    // Force a failure in the transaction where the job is updated
    prismaMock.$transaction.mockImplementationOnce(async (cb: any) => cb(txMock)); // claim
    prismaMock.$transaction.mockImplementationOnce(async () => { throw new Error('Processing failed'); }); // processing
    prismaMock.$transaction.mockImplementationOnce(async (cb: any) => cb(txMock)); // catch block recovery

    const result = await worker.runOnce(10);

    expect(result).toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(txMock.mediaProcessingJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'RETRYING', attempts: 1 }),
      }),
    );
  });

  it('marks job as DEAD on max attempts', async () => {
    txMock.mediaProcessingJob.findMany
      .mockResolvedValueOnce([{ id: 'job-1', mediaAssetId: 'asset-1', jobType: 'METADATA_EXTRACTION', attempts: 2, maxAttempts: 3 }])
      .mockResolvedValueOnce([{ status: 'DEAD' }]); // Evaluate asset status call

    // Force a failure in the transaction where the job is updated
    prismaMock.$transaction.mockImplementationOnce(async (cb: any) => cb(txMock)); // claim
    prismaMock.$transaction.mockImplementationOnce(async () => { throw new Error('Processing failed'); }); // processing
    prismaMock.$transaction.mockImplementationOnce(async (cb: any) => cb(txMock)); // catch block recovery

    const result = await worker.runOnce(10);

    expect(result).toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(txMock.mediaProcessingJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'DEAD', attempts: 3 }),
      }),
    );
    expect(txMock.mediaAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { status: 'PROCESSING_FAILED' },
    });
  });
});
