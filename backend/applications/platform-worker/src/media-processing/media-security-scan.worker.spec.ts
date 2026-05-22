import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaSecurityScanWorker } from './media-security-scan.worker.js';
import { FixtureMediaVirusScanner } from '../../../platform-api/src/modules/media-library/infrastructure/scanning/fixture-media-virus-scanner.adapter.js';

describe('MediaSecurityScanWorker', () => {
  let worker: MediaSecurityScanWorker;
  let txMock: any;
  let prismaMock: any;

  beforeEach(() => {
    txMock = {
      mediaSecurityScanJob: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
      mediaAsset: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      outboxMessage: {
        create: vi.fn(),
      },
    };

    prismaMock = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(txMock)),
      mediaAsset: {
        findUnique: vi.fn(),
      },
    };

    const scanner = new FixtureMediaVirusScanner();
    worker = new MediaSecurityScanWorker(prismaMock as any, scanner);
  });

  it('claims jobs and processes clean files successfully', async () => {
    txMock.mediaSecurityScanJob.findMany.mockResolvedValueOnce([
      { id: 'job-1', mediaAssetId: 'asset-1', attempts: 0, maxAttempts: 3 },
    ]);
    prismaMock.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 'asset-1',
      filename: 'clean-file.pdf',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    });

    const result = await worker.runOnce(10);

    expect(result).toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(txMock.mediaSecurityScanJob.updateMany).toHaveBeenCalled();
    expect(txMock.mediaSecurityScanJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'CLEAN' }),
      }),
    );
    expect(txMock.mediaAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: expect.objectContaining({ scanStatus: 'CLEAN' }),
    });
    expect(txMock.outboxMessage.create).toHaveBeenCalled();
  });

  it('quarantines infected files and issues events', async () => {
    txMock.mediaSecurityScanJob.findMany.mockResolvedValueOnce([
      { id: 'job-2', mediaAssetId: 'asset-2', attempts: 0, maxAttempts: 3 },
    ]);
    prismaMock.mediaAsset.findUnique.mockResolvedValueOnce({
      id: 'asset-2',
      filename: 'infected-virus-file.exe',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    });

    const result = await worker.runOnce(10);

    expect(result).toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(txMock.mediaSecurityScanJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-2' },
        data: expect.objectContaining({ status: 'INFECTED' }),
      }),
    );
    expect(txMock.mediaAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-2' },
      data: expect.objectContaining({ scanStatus: 'QUARANTINED' }),
    });
    expect(txMock.outboxMessage.create).toHaveBeenCalled();
  });

  it('marks scan job failed and mediaAsset scanStatus as SCAN_FAILED on error', async () => {
    txMock.mediaSecurityScanJob.findMany.mockResolvedValueOnce([
      { id: 'job-3', mediaAssetId: 'asset-3', attempts: 0, maxAttempts: 3 },
    ]);
    prismaMock.mediaAsset.findUnique.mockImplementationOnce(() => {
      throw new Error('Database connection issue');
    });

    const result = await worker.runOnce(10);

    expect(result).toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(txMock.mediaSecurityScanJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-3' },
        data: expect.objectContaining({ status: 'RETRYING' }),
      }),
    );
    expect(txMock.mediaAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset-3' },
      data: expect.objectContaining({ scanStatus: 'SCAN_FAILED' }),
    });
  });
});
