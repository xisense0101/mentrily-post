import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InboxRepository } from '../inbox.repository';
import { InboxMessageStatus as InboxMessageStatusDB, Prisma } from '@prisma/client';
import { InboxMessageStatus } from '@mentrily/service-core';
import type { PrismaService } from '../../prisma.service';

describe('InboxRepository', () => {
  let repository: InboxRepository;
  let prismaMock: {
    inboxMessage: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      inboxMessage: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
    };
    repository = new InboxRepository(prismaMock as unknown as PrismaService);
  });

  it('claims new inbound event on first receipt', async () => {
    const mockRecord = {
      id: 'inbox-1',
      source: 'stripe',
      externalEventId: 'evt_1234',
      eventName: 'charge.completed',
      idempotencyKey: null,
      payloadHash: '0f8e2b5c9e4d1a7f3b6c9e2d1a5f8b0c1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
      status: InboxMessageStatusDB.RECEIVED,
      receivedAt: new Date(),
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.inboxMessage.create.mockResolvedValue(mockRecord);

    const result = await repository.claimOrInsert(
      'stripe',
      'evt_1234',
      'charge.completed',
      { id: '123', amount: 1000 },
    );

    expect(result.wasClaimed).toBe(true);
    expect(result.record.externalEventId).toBe('evt_1234');
    expect(result.record.status).toBe(InboxMessageStatus.RECEIVED);
  });

  it('detects duplicate inbound event by (source + externalEventId)', async () => {
    const existingRecord = {
      id: 'inbox-1',
      source: 'stripe',
      externalEventId: 'evt_1234',
      eventName: 'charge.completed',
      idempotencyKey: null,
      payloadHash: '0f8e2b5c9e4d1a7f3b6c9e2d1a5f8b0c1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
      status: InboxMessageStatusDB.RECEIVED,
      receivedAt: new Date(),
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`source`,`externalEventId`)',
      {
        code: 'P2002',
        clientVersion: '4.0.0',
        meta: {
          target: ['source_externalEventId_key'],
        },
      },
    );

    prismaMock.inboxMessage.create.mockRejectedValue(duplicateError);
    prismaMock.inboxMessage.findUnique.mockResolvedValue(existingRecord);

    const result = await repository.claimOrInsert(
      'stripe',
      'evt_1234',
      'charge.completed',
      { id: '123', amount: 1000 },
    );

    expect(result.wasClaimed).toBe(false);
    expect(result.record.id).toBe('inbox-1');
  });

  it('treats compound target array duplicate errors the same way', async () => {
    const existingRecord = {
      id: 'inbox-dup-2',
      source: 'stripe',
      externalEventId: 'evt_9999',
      eventName: 'charge.completed',
      idempotencyKey: null,
      payloadHash: '0f8e2b5c9e4d1a7f3b6c9e2d1a5f8b0c1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
      status: InboxMessageStatusDB.RECEIVED,
      receivedAt: new Date(),
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`source`,`externalEventId`)',
      {
        code: 'P2002',
        clientVersion: '4.0.0',
        meta: {
          target: ['source', 'externalEventId'],
        },
      },
    );

    prismaMock.inboxMessage.create.mockRejectedValue(duplicateError);
    prismaMock.inboxMessage.findUnique.mockResolvedValue(existingRecord);

    const result = await repository.claimOrInsert(
      'stripe',
      'evt_9999',
      'charge.completed',
      { id: '123', amount: 1000 },
    );

    expect(result.wasClaimed).toBe(false);
    expect(result.record.id).toBe('inbox-dup-2');
  });

  it('persists payload hash for change detection', async () => {
    const payload = { id: '123', amount: 1000, currency: 'usd' };
    const expectedHash = '0e72f1e7e40b4b89224deb6ba7fc25e58cdfa4bd7f5087bdbff9f99d218cf228';

    const mockRecord = {
      id: 'inbox-2',
      source: 'stripe',
      externalEventId: 'evt_5678',
      eventName: 'charge.completed',
      idempotencyKey: null,
      payloadHash: expectedHash,
      status: InboxMessageStatusDB.RECEIVED,
      receivedAt: new Date(),
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.inboxMessage.create.mockResolvedValue(mockRecord);

    const result = await repository.claimOrInsert(
      'stripe',
      'evt_5678',
      'charge.completed',
      payload,
    );

    expect(prismaMock.inboxMessage.create).toHaveBeenCalledWith({
      data: {
        source: 'stripe',
        externalEventId: 'evt_5678',
        eventName: 'charge.completed',
        idempotencyKey: null,
        payloadHash: expect.any(String),
        status: InboxMessageStatusDB.RECEIVED,
        receivedAt: expect.any(Date),
      },
    });

    expect(result.record.payloadHash).toBeDefined();
    expect(result.record.payloadHash).toHaveLength(64); // SHA256 hex
  });

  it('transitions status RECEIVED -> PROCESSING -> PROCESSED', async () => {
    const messageId = 'inbox-1';

    // Mark as processing
    await repository.markProcessing(messageId);
    expect(prismaMock.inboxMessage.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: { status: InboxMessageStatusDB.PROCESSING },
    });

    // Mark as processed
    prismaMock.inboxMessage.update.mockClear();
    await repository.markProcessed(messageId);
    expect(prismaMock.inboxMessage.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: {
        status: InboxMessageStatusDB.PROCESSED,
        processedAt: expect.any(Date),
      },
    });
  });

  it('can mark message as FAILED', async () => {
    const messageId = 'inbox-1';

    await repository.markFailed(messageId);

    expect(prismaMock.inboxMessage.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: { status: InboxMessageStatusDB.FAILED },
    });
  });

  it('finds messages by status for polling', async () => {
    const mockRecords = [
      {
        id: 'inbox-1',
        source: 'stripe',
        externalEventId: 'evt_1',
        eventName: 'charge.completed',
        idempotencyKey: null,
        payloadHash: 'hash1',
        status: InboxMessageStatusDB.RECEIVED,
        receivedAt: new Date(),
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'inbox-2',
        source: 'stripe',
        externalEventId: 'evt_2',
        eventName: 'charge.completed',
        idempotencyKey: null,
        payloadHash: 'hash2',
        status: InboxMessageStatusDB.RECEIVED,
        receivedAt: new Date(),
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    prismaMock.inboxMessage.findMany.mockResolvedValue(mockRecords);

    const results = await repository.findByStatus(InboxMessageStatus.RECEIVED, 10);

    expect(prismaMock.inboxMessage.findMany).toHaveBeenCalledWith({
      where: { status: InboxMessageStatus.RECEIVED },
      orderBy: { receivedAt: 'asc' },
      take: 10,
    });

    expect(results).toHaveLength(2);
  });

  it('finds message by source and external ID', async () => {
    const mockRecord = {
      id: 'inbox-1',
      source: 'stripe',
      externalEventId: 'evt_1234',
      eventName: 'charge.completed',
      idempotencyKey: null,
      payloadHash: 'hash',
      status: InboxMessageStatusDB.RECEIVED,
      receivedAt: new Date(),
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.inboxMessage.findUnique.mockResolvedValue(mockRecord);

    const result = await repository.findBySourceAndExternalId('stripe', 'evt_1234');

    expect(prismaMock.inboxMessage.findUnique).toHaveBeenCalledWith({
      where: {
        source_externalEventId: {
          source: 'stripe',
          externalEventId: 'evt_1234',
        },
      },
    });

    expect(result?.id).toBe('inbox-1');
  });

  it('claims only received messages with conditional updates', async () => {
    const candidateOne = {
      id: 'inbox-3',
      source: 'stripe',
      externalEventId: 'evt_3',
      eventName: 'charge.completed',
      idempotencyKey: null,
      payloadHash: 'hash-3',
      status: InboxMessageStatusDB.RECEIVED,
      receivedAt: new Date('2026-05-11T10:00:00Z'),
      processedAt: null,
      createdAt: new Date('2026-05-11T10:00:00Z'),
      updatedAt: new Date(),
    };
    const candidateTwo = {
      ...candidateOne,
      id: 'inbox-4',
      externalEventId: 'evt_4',
      receivedAt: new Date('2026-05-11T10:01:00Z'),
      createdAt: new Date('2026-05-11T10:01:00Z'),
    };
    const claimedOne = { ...candidateOne, status: InboxMessageStatusDB.PROCESSING };
    const claimedTwo = { ...candidateTwo, status: InboxMessageStatusDB.PROCESSING };

    prismaMock.inboxMessage.findMany.mockResolvedValue([candidateOne, candidateTwo]);
    prismaMock.inboxMessage.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    prismaMock.inboxMessage.findUnique
      .mockResolvedValueOnce(claimedOne)
      .mockResolvedValueOnce(claimedTwo);

    const claimed = await repository.claimReceivedBatch(2);

    expect(prismaMock.inboxMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: InboxMessageStatus.RECEIVED,
        }),
        take: 2,
      }),
    );
    expect(prismaMock.inboxMessage.updateMany).toHaveBeenCalledTimes(2);
    expect(claimed).toHaveLength(2);
    expect(claimed[0]!.status).toBe(InboxMessageStatus.PROCESSING);
  });

  it('skips already-claimed inbox messages', async () => {
    const candidate = {
      id: 'inbox-5',
      source: 'stripe',
      externalEventId: 'evt_5',
      eventName: 'charge.completed',
      idempotencyKey: null,
      payloadHash: 'hash-5',
      status: InboxMessageStatusDB.RECEIVED,
      receivedAt: new Date(),
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.inboxMessage.findMany.mockResolvedValue([candidate]);
    prismaMock.inboxMessage.updateMany.mockResolvedValue({ count: 0 });

    const claimed = await repository.claimReceivedBatch(1);

    expect(prismaMock.inboxMessage.findUnique).not.toHaveBeenCalled();
    expect(claimed).toHaveLength(0);
  });

  it('respects inbox claim batch limits', async () => {
    const candidates = Array.from({ length: 3 }, (_, index) => ({
      id: `inbox-${index + 1}`,
      source: 'stripe',
      externalEventId: `evt_${index + 1}`,
      eventName: 'charge.completed',
      idempotencyKey: null,
      payloadHash: `hash-${index + 1}`,
      status: InboxMessageStatusDB.RECEIVED,
      receivedAt: new Date(Date.now() + index),
      processedAt: null,
      createdAt: new Date(Date.now() + index),
      updatedAt: new Date(),
    }));

    // Mock returns 3 items, but claimReceivedBatch(2) should only process 2
    prismaMock.inboxMessage.findMany.mockResolvedValue(candidates);
    prismaMock.inboxMessage.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.inboxMessage.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
      candidates.find((candidate) => candidate.id === where.id),
    );

    const claimed = await repository.claimReceivedBatch(2);

    expect(claimed).toHaveLength(2);
    expect(prismaMock.inboxMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
    expect(prismaMock.inboxMessage.updateMany).toHaveBeenCalledTimes(2);
  });

  it('returns empty array for limit 0', async () => {
    const claimed = await repository.claimReceivedBatch(0);
    expect(claimed).toHaveLength(0);
    expect(prismaMock.inboxMessage.findMany).not.toHaveBeenCalled();
    expect(prismaMock.inboxMessage.updateMany).not.toHaveBeenCalled();
  });

  it('returns empty array for negative limit', async () => {
    const claimed = await repository.claimReceivedBatch(-1);
    expect(claimed).toHaveLength(0);
    expect(prismaMock.inboxMessage.findMany).not.toHaveBeenCalled();
    expect(prismaMock.inboxMessage.updateMany).not.toHaveBeenCalled();
  });

  it('returns null when message not found', async () => {
    prismaMock.inboxMessage.findUnique.mockResolvedValue(null);

    const result = await repository.findById('nonexistent');

    expect(result).toBeNull();
  });

  it('uses transaction client when provided', async () => {
    const txClient = {
      inboxMessage: {
        create: vi.fn().mockResolvedValue({ id: 'tx-inbox', receivedAt: new Date(), createdAt: new Date() }),
      },
    };
    const transaction = { transactionId: 'tx-id', client: txClient };

    await repository.claimOrInsert('stripe', 'tx-evt', 'test.evt', {}, undefined, transaction as any);

    expect(txClient.inboxMessage.create).toHaveBeenCalled();
    expect(prismaMock.inboxMessage.create).not.toHaveBeenCalled();
  });
});
