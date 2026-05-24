import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationDeliveryWorker } from '../communication-delivery.worker.js';

describe('CommunicationDeliveryWorker', () => {
  let worker: CommunicationDeliveryWorker;
  let prismaMock: any;
  let schedulerServiceMock: any;
  let intentRepositoryMock: any;

  beforeEach(() => {
    const txMock = {
      notificationIntent: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
    };

    prismaMock = {
      $transaction: vi.fn().mockImplementation(async (callback: any) => callback(txMock)),
      notificationIntent: {
        update: vi.fn(),
      },
    };

    schedulerServiceMock = {
      processIntent: vi.fn(),
    };

    intentRepositoryMock = {
      findById: vi.fn(),
    };

    worker = new CommunicationDeliveryWorker(
      prismaMock as any,
      schedulerServiceMock as any,
      intentRepositoryMock as any,
    );
  });

  it('claims and processes pending intents successfully', async () => {
    const txMock = {
      notificationIntent: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ id: 'intent-1' }]) // first call (dueIntents)
          .mockResolvedValueOnce([{ id: 'intent-1' }]), // second call (verifiedIntents)
        updateMany: vi.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (callback: any) => callback(txMock));

    const mockIntent = {
      id: 'intent-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      createdByPrincipalId: 'principal-1',
    };
    intentRepositoryMock.findById.mockResolvedValue(mockIntent);

    schedulerServiceMock.processIntent.mockResolvedValue({
      intentId: 'intent-1',
      status: 'DISPATCHED',
      deliveryAttemptId: 'attempt-1',
    });

    const result = await worker.runOnce(5);

    expect(result).toEqual({ claimed: 1, processed: 1, failed: 0, skipped: 0 });
    expect(txMock.notificationIntent.findMany).toHaveBeenCalledTimes(2);
    expect(txMock.notificationIntent.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['intent-1'] },
        status: 'QUEUED',
        OR: [{ lockedAt: null }, { lockedAt: { lte: expect.any(Date) } }],
      },
      data: {
        lockedAt: expect.any(Date),
        lockedBy: expect.any(String),
      },
    });
    expect(intentRepositoryMock.findById).toHaveBeenCalledWith('intent-1');
  });

  it('skips processing if intent is not found', async () => {
    const txMock = {
      notificationIntent: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ id: 'intent-1' }])
          .mockResolvedValueOnce([{ id: 'intent-1' }]),
        updateMany: vi.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (callback: any) => callback(txMock));

    intentRepositoryMock.findById.mockResolvedValue(null);

    const result = await worker.runOnce(5);

    expect(result).toEqual({ claimed: 1, processed: 0, failed: 0, skipped: 1 });
  });

  it('handles processing failure and unlocks intent', async () => {
    const txMock = {
      notificationIntent: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ id: 'intent-1' }])
          .mockResolvedValueOnce([{ id: 'intent-1' }]),
        updateMany: vi.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (callback: any) => callback(txMock));

    const mockIntent = {
      id: 'intent-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      createdByPrincipalId: 'principal-1',
    };
    intentRepositoryMock.findById.mockResolvedValue(mockIntent);

    schedulerServiceMock.processIntent.mockRejectedValue(new Error('Provider timeout'));

    const result = await worker.runOnce(5);

    expect(result).toEqual({ claimed: 1, processed: 0, failed: 1, skipped: 0 });
    expect(prismaMock.notificationIntent.update).toHaveBeenCalledWith({
      where: { id: 'intent-1' },
      data: {
        lockedAt: null,
        lockedBy: null,
      },
    });
  });

  it('does not duplicate sends if concurrent workers compete', async () => {
    // If verifiedIntents returns empty because another worker committed lock first
    const txMock = {
      notificationIntent: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ id: 'intent-1' }]) // found by search
          .mockResolvedValueOnce([]), // but updateMany updated 0 rows (so verifiedIntents is empty)
        updateMany: vi.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (callback: any) => callback(txMock));

    const result = await worker.runOnce(5);

    expect(result).toEqual({ claimed: 0, processed: 0, failed: 0, skipped: 0 });
    expect(intentRepositoryMock.findById).not.toHaveBeenCalled();
  });
});
