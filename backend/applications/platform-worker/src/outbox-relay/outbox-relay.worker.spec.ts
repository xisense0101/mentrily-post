import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutboxRelayWorker } from './outbox-relay.worker.js';
import { EventDispatcherPort } from './event-dispatcher.port.js';
import { OutboxMessageStatus } from '@mentrily/service-core';

describe('OutboxRelayWorker', () => {
  let outboxRepositoryMock: {
    claimPendingBatch: ReturnType<typeof vi.fn>;
    markPublished: ReturnType<typeof vi.fn>;
    markFailedOrRetry: ReturnType<typeof vi.fn>;
  };
  let dispatcherMock: EventDispatcherPort & { dispatch: ReturnType<typeof vi.fn> };
  let worker: OutboxRelayWorker;

  beforeEach(() => {
    outboxRepositoryMock = {
      claimPendingBatch: vi.fn(),
      markPublished: vi.fn(),
      markFailedOrRetry: vi.fn(),
    };
    dispatcherMock = {
      dispatch: vi.fn(),
    } as EventDispatcherPort & { dispatch: ReturnType<typeof vi.fn> };
    worker = new OutboxRelayWorker(outboxRepositoryMock as any, dispatcherMock);
  });

  it('claims outbox messages and marks successful dispatches published', async () => {
    const claimedRecords = [
      {
        id: 'msg-1',
        eventId: 'evt-1',
        eventName: 'identity.membership.granted.v1',
        eventVersion: 1,
        tenantId: 'tenant-1',
        workspaceId: 'ws-1',
        correlationId: 'corr-1',
        idempotencyKey: null,
        payload: { principalId: 'principal-1' },
        occurredAt: new Date(),
        status: OutboxMessageStatus.PROCESSING,
        attemptCount: 0,
        availableAt: new Date(),
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    outboxRepositoryMock.claimPendingBatch.mockResolvedValue(claimedRecords);
    dispatcherMock.dispatch.mockResolvedValue(undefined);

    const result = await worker.runOnce(10);

    expect(outboxRepositoryMock.claimPendingBatch).toHaveBeenCalledWith(10, expect.any(Date));
    expect(dispatcherMock.dispatch).toHaveBeenCalledWith(claimedRecords[0]);
    expect(outboxRepositoryMock.markPublished).toHaveBeenCalledWith('msg-1');
    expect(result).toEqual({ claimed: 1, published: 1, retried: 0, failed: 0 });
  });

  it('sends failed dispatches through retry path', async () => {
    const claimedRecord = {
      id: 'msg-2',
      eventId: 'evt-2',
      eventName: 'identity.membership.granted.v1',
      eventVersion: 1,
      tenantId: null,
      workspaceId: null,
      correlationId: 'corr-2',
      idempotencyKey: null,
      payload: { principalId: 'principal-2' },
      occurredAt: new Date(),
      status: OutboxMessageStatus.PROCESSING,
      attemptCount: 1,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    outboxRepositoryMock.claimPendingBatch.mockResolvedValue([claimedRecord]);
    dispatcherMock.dispatch.mockRejectedValue(new Error('dispatch failed'));
    outboxRepositoryMock.markFailedOrRetry.mockResolvedValue(undefined);

    const result = await worker.runOnce(10, new Date('2026-05-11T10:00:00Z'));

    expect(outboxRepositoryMock.markFailedOrRetry).toHaveBeenCalledWith(
      'msg-2',
      expect.any(Date),
      10,
    );
    expect(result).toEqual({ claimed: 1, published: 0, retried: 1, failed: 0 });
  });

  it('marks exhausted retries as failed', async () => {
    const claimedRecord = {
      id: 'msg-3',
      eventId: 'evt-3',
      eventName: 'identity.membership.granted.v1',
      eventVersion: 1,
      tenantId: null,
      workspaceId: null,
      correlationId: 'corr-3',
      idempotencyKey: null,
      payload: { principalId: 'principal-3' },
      occurredAt: new Date(),
      status: OutboxMessageStatus.PROCESSING,
      attemptCount: 9,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    outboxRepositoryMock.claimPendingBatch.mockResolvedValue([claimedRecord]);
    dispatcherMock.dispatch.mockRejectedValue(new Error('dispatch failed'));
    outboxRepositoryMock.markFailedOrRetry.mockResolvedValue(undefined);

    worker = new OutboxRelayWorker(outboxRepositoryMock as any, dispatcherMock);
    await worker.runOnce(10, new Date('2026-05-11T10:00:00Z'));

    expect(outboxRepositoryMock.markFailedOrRetry).toHaveBeenCalledWith('msg-3', undefined, 10);
  });

  it('handles an empty batch safely', async () => {
    outboxRepositoryMock.claimPendingBatch.mockResolvedValue([]);

    const result = await worker.runOnce(10);

    expect(dispatcherMock.dispatch).not.toHaveBeenCalled();
    expect(outboxRepositoryMock.markPublished).not.toHaveBeenCalled();
    expect(outboxRepositoryMock.markFailedOrRetry).not.toHaveBeenCalled();
    expect(result).toEqual({ claimed: 0, published: 0, retried: 0, failed: 0 });
  });
});
