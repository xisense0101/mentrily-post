import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InboxProcessingWorker } from './inbox-processing.worker.js';
import { InboxHandlerRegistry } from './inbox-handler-registry.js';
import type { InboxEventHandler } from './noop-inbox-handler.js';
import { InboxMessageStatus } from '@mentrily/service-core';

describe('InboxProcessingWorker', () => {
  let inboxRepositoryMock: {
    claimReceivedBatch: ReturnType<typeof vi.fn>;
    markProcessed: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
  };
  let registry: InboxHandlerRegistry;
  let worker: InboxProcessingWorker;

  beforeEach(() => {
    inboxRepositoryMock = {
      claimReceivedBatch: vi.fn(),
      markProcessed: vi.fn(),
      markFailed: vi.fn(),
    };
    registry = new InboxHandlerRegistry();
    worker = new InboxProcessingWorker(inboxRepositoryMock as any, registry);
  });

  it('claims received inbox messages and marks known handlers processed', async () => {
    const handler: InboxEventHandler = {
      handle: vi.fn(),
    };

    registry.register('identity.membership.granted.v1', handler);

    const claimedRecords = [
      {
        id: 'inbox-1',
        source: 'stripe',
        externalEventId: 'evt-1',
        eventName: 'identity.membership.granted.v1',
        idempotencyKey: null,
        payloadHash: 'hash-1',
        status: InboxMessageStatus.PROCESSING,
        receivedAt: new Date(),
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    inboxRepositoryMock.claimReceivedBatch.mockResolvedValue(claimedRecords);

    const result = await worker.runOnce(10);

    expect(inboxRepositoryMock.claimReceivedBatch).toHaveBeenCalledWith(10);
    expect(handler.handle).toHaveBeenCalledWith(claimedRecords[0]);
    expect(inboxRepositoryMock.markProcessed).toHaveBeenCalledWith('inbox-1');
    expect(result).toEqual({ claimed: 1, processed: 1, failed: 0 });
  });

  it('uses the explicit no-op handler for unknown event names', async () => {
    const claimedRecord = {
      id: 'inbox-2',
      source: 'stripe',
      externalEventId: 'evt-2',
      eventName: 'unknown.event.v1',
      idempotencyKey: null,
      payloadHash: 'hash-2',
      status: InboxMessageStatus.PROCESSING,
      receivedAt: new Date(),
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inboxRepositoryMock.claimReceivedBatch.mockResolvedValue([claimedRecord]);

    const result = await worker.runOnce(10);

    expect(inboxRepositoryMock.markProcessed).toHaveBeenCalledWith('inbox-2');
    expect(inboxRepositoryMock.markFailed).not.toHaveBeenCalled();
    expect(result).toEqual({ claimed: 1, processed: 1, failed: 0 });
  });

  it('marks failed when a handler throws', async () => {
    registry.register('identity.membership.granted.v1', {
      handle: vi.fn().mockRejectedValue(new Error('handler failed')),
    });

    const claimedRecord = {
      id: 'inbox-3',
      source: 'stripe',
      externalEventId: 'evt-3',
      eventName: 'identity.membership.granted.v1',
      idempotencyKey: null,
      payloadHash: 'hash-3',
      status: InboxMessageStatus.PROCESSING,
      receivedAt: new Date(),
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inboxRepositoryMock.claimReceivedBatch.mockResolvedValue([claimedRecord]);

    const result = await worker.runOnce(10);

    expect(inboxRepositoryMock.markFailed).toHaveBeenCalledWith('inbox-3');
    expect(result).toEqual({ claimed: 1, processed: 0, failed: 1 });
  });

  it('handles an empty batch safely', async () => {
    inboxRepositoryMock.claimReceivedBatch.mockResolvedValue([]);

    const result = await worker.runOnce(10);

    expect(inboxRepositoryMock.markProcessed).not.toHaveBeenCalled();
    expect(inboxRepositoryMock.markFailed).not.toHaveBeenCalled();
    expect(result).toEqual({ claimed: 0, processed: 0, failed: 0 });
  });
});
