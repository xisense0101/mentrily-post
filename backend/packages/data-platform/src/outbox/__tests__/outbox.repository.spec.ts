import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RequestContext, OutboxEvent } from '@mentrily/service-core';
import { OutboxRepository, isUniqueEventIdViolation } from '../outbox.repository';
import { OutboxMessageStatus, Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma.service';

describe('OutboxRepository', () => {
  let repository: OutboxRepository;
  let prismaMock: {
    outboxMessage: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      outboxMessage: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
    };
    repository = new OutboxRepository(prismaMock as unknown as PrismaService);
  });

  it('persists complete event envelope to outbox', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-123',
      eventName: 'identity.membership.granted.v1',
      eventVersion: 1,
      tenantId: 'tenant-001',
      workspaceId: 'ws-001',
      correlationId: 'corr-xyz',
      idempotencyKey: 'idempotency-abc',
      occurredAt: new Date().toISOString(),
      payload: {
        principalId: 'principal-123',
        workspaceId: 'ws-001',
        roleKey: 'member',
      },
    };

    const context: RequestContext = {
      requestId: 'req-789',
      correlationId: 'corr-xyz',
      timestamp: new Date().toISOString(),
      workspace: {
        tenantId: 'tenant-001',
        workspaceId: 'ws-001',
        actorId: 'actor-123',
      },
    };

    const mockRecord = {
      id: 'msg-001',
      eventId: event.eventId,
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      tenantId: event.tenantId,
      workspaceId: event.workspaceId,
      correlationId: event.correlationId,
      idempotencyKey: event.idempotencyKey,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
      status: OutboxMessageStatus.PENDING,
      attemptCount: 0,
      availableAt: expect.any(Date),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.outboxMessage.create.mockResolvedValue(mockRecord);

    const result = await repository.append(event, context);

    expect(prismaMock.outboxMessage.create).toHaveBeenCalledWith({
      data: {
        eventId: event.eventId,
        eventName: event.eventName,
        eventVersion: event.eventVersion,
        tenantId: event.tenantId,
        workspaceId: event.workspaceId,
        correlationId: context.correlationId,
        idempotencyKey: event.idempotencyKey,
        payload: event.payload,
        occurredAt: new Date(event.occurredAt),
        status: OutboxMessageStatus.PENDING,
        attemptCount: 0,
        availableAt: expect.any(Date),
      },
    });

    expect(result.eventId).toBe('evt-123');
    expect(result.eventName).toBe('identity.membership.granted.v1');
    expect(result.status).toBe('PENDING');
  });

  it('preserves event correlationId over request correlationId', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-correlation-override',
      eventName: 'commercial.entitlement.changed.v1',
      eventVersion: 1,
      tenantId: 'tenant-001',
      workspaceId: 'ws-001',
      correlationId: 'corr-from-event',
      idempotencyKey: 'idempotency-correlation',
      occurredAt: new Date().toISOString(),
      payload: { entitlementKey: 'white_label', enabled: true },
    };

    const context: RequestContext = {
      requestId: 'req-correlation',
      correlationId: 'corr-from-context',
      timestamp: new Date().toISOString(),
      workspace: {
        tenantId: 'tenant-001',
        workspaceId: 'ws-001',
        actorId: 'actor-123',
      },
    };

    const mockRecord = {
      id: 'msg-correlation',
      eventId: event.eventId,
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      tenantId: event.tenantId,
      workspaceId: event.workspaceId,
      correlationId: event.correlationId,
      idempotencyKey: event.idempotencyKey,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
      status: OutboxMessageStatus.PENDING,
      attemptCount: 0,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.outboxMessage.create.mockResolvedValue(mockRecord);

    await repository.append(event, context);

    expect(prismaMock.outboxMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        correlationId: 'corr-from-event',
      }),
    });
  });

  it('returns existing record on duplicate eventId', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-dupe-001',
      eventName: 'identity.membership.granted.v1',
      eventVersion: 1,
      correlationId: 'corr-dupe',
      occurredAt: new Date().toISOString(),
      payload: { principalId: 'principal-123' },
    };

    const context: RequestContext = {
      requestId: 'req-dupe',
      correlationId: 'corr-dupe',
      timestamp: new Date().toISOString(),
    };

    const existingRecord = {
      id: 'msg-dupe',
      eventId: event.eventId,
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      tenantId: null,
      workspaceId: null,
      correlationId: event.correlationId,
      idempotencyKey: null,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
      status: OutboxMessageStatus.PENDING,
      attemptCount: 0,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`eventId`)',
      {
        code: 'P2002',
        clientVersion: '4.0.0',
        meta: {
          target: ['eventId'],
        },
      },
    );

    prismaMock.outboxMessage.create.mockRejectedValue(duplicateError);
    prismaMock.outboxMessage.findUnique.mockResolvedValue(existingRecord);

    const result = await repository.append(event, context);

    expect(prismaMock.outboxMessage.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.outboxMessage.findUnique).toHaveBeenCalledWith({
      where: { eventId: event.eventId },
    });
    expect(result.id).toBe('msg-dupe');
    expect(result.eventId).toBe(event.eventId);
  });

  it('returns existing record on duplicate eventId when payload differs', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-dupe-payload',
      eventName: 'identity.membership.granted.v1',
      eventVersion: 1,
      correlationId: 'corr-dupe-payload',
      occurredAt: new Date().toISOString(),
      payload: { principalId: 'principal-new' },
    };

    const context: RequestContext = {
      requestId: 'req-dupe-payload',
      correlationId: 'corr-dupe-payload',
      timestamp: new Date().toISOString(),
    };

    const existingRecord = {
      id: 'msg-existing-payload',
      eventId: event.eventId,
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      tenantId: null,
      workspaceId: null,
      correlationId: event.correlationId,
      idempotencyKey: null,
      payload: { principalId: 'principal-original' },
      occurredAt: new Date(event.occurredAt),
      status: OutboxMessageStatus.PENDING,
      attemptCount: 0,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.outboxMessage.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '4.0.0',
        meta: { target: ['eventId'] },
      }),
    );
    prismaMock.outboxMessage.findUnique.mockResolvedValue(existingRecord);

    const result = await repository.append(event, context);

    expect(result.id).toBe(existingRecord.id);
    expect(result.payload).toEqual(existingRecord.payload);
    expect(prismaMock.outboxMessage.findUnique).toHaveBeenCalledTimes(1);
  });

  it('rethrows unrelated unique violations', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-other-unique',
      eventName: 'identity.membership.granted.v1',
      eventVersion: 1,
      correlationId: 'corr-other-unique',
      occurredAt: new Date().toISOString(),
      payload: { principalId: 'principal-123' },
    };

    const context: RequestContext = {
      requestId: 'req-other-unique',
      correlationId: 'corr-other-unique',
      timestamp: new Date().toISOString(),
    };

    const unrelatedError = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '4.0.0',
      meta: { target: ['workspaceId'] },
    });

    prismaMock.outboxMessage.create.mockRejectedValue(unrelatedError);

    await expect(repository.append(event, context)).rejects.toBe(unrelatedError);
    expect(prismaMock.outboxMessage.findUnique).not.toHaveBeenCalled();
  });

  it('rethrows non-Prisma errors from create', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-create-error',
      eventName: 'identity.membership.granted.v1',
      eventVersion: 1,
      correlationId: 'corr-create-error',
      occurredAt: new Date().toISOString(),
      payload: { principalId: 'principal-123' },
    };

    const context: RequestContext = {
      requestId: 'req-create-error',
      correlationId: 'corr-create-error',
      timestamp: new Date().toISOString(),
    };

    const error = new Error('database unavailable');
    prismaMock.outboxMessage.create.mockRejectedValue(error);

    await expect(repository.append(event, context)).rejects.toBe(error);
    expect(prismaMock.outboxMessage.findUnique).not.toHaveBeenCalled();
  });

  it('detects duplicate eventId violations for supported Prisma target shapes only', () => {
    const eventIdArrayError = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '4.0.0',
      meta: { target: ['eventId'] },
    });
    const eventIdConstraintError = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '4.0.0',
      meta: { target: ['OutboxMessage_eventId_key'] },
    });
    const eventIdStringError = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '4.0.0',
      meta: { target: 'eventId' },
    });
    const unrelatedStringError = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '4.0.0',
      meta: { target: 'workspaceId' },
    });

    expect(isUniqueEventIdViolation(eventIdArrayError)).toBe(true);
    expect(isUniqueEventIdViolation(eventIdConstraintError)).toBe(true);
    expect(isUniqueEventIdViolation(eventIdStringError)).toBe(true);
    expect(isUniqueEventIdViolation(unrelatedStringError)).toBe(false);
  });

  it('initializes status as PENDING', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-456',
      eventName: 'test.event.v1',
      eventVersion: 1,
      correlationId: 'corr-abc',
      occurredAt: new Date().toISOString(),
      payload: {},
    };

    const context: RequestContext = {
      requestId: 'req-001',
      correlationId: 'corr-abc',
      timestamp: new Date().toISOString(),
    };

    const mockRecord = {
      id: 'msg-002',
      ...event,
      tenantId: null,
      workspaceId: null,
      idempotencyKey: null,
      status: OutboxMessageStatus.PENDING,
      attemptCount: 0,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
    };

    prismaMock.outboxMessage.create.mockResolvedValue(mockRecord);

    const result = await repository.append(event, context);

    expect(result.status).toBe('PENDING');
    expect(result.attemptCount).toBe(0);
  });

  it('findPending polls messages with correct filters', async () => {
    const mockRecords = [
      {
        id: 'msg-001',
        eventId: 'evt-1',
        eventName: 'evt.1.v1',
        eventVersion: 1,
        tenantId: null,
        workspaceId: null,
        correlationId: 'corr-1',
        idempotencyKey: null,
        payload: {},
        occurredAt: new Date(),
        status: OutboxMessageStatus.PENDING,
        attemptCount: 0,
        availableAt: new Date(),
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    prismaMock.outboxMessage.findMany.mockResolvedValue(mockRecords);

    const now = new Date();
    const results = await repository.findPending(10, now);

    expect(prismaMock.outboxMessage.findMany).toHaveBeenCalledWith({
      where: {
        status: OutboxMessageStatus.PENDING,
        availableAt: {
          lte: now,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 10,
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.eventId).toBe('evt-1');
  });

  it('claims only pending available messages with conditional updates', async () => {
    const candidateOne = {
      id: 'msg-001',
      eventId: 'evt-1',
      eventName: 'evt.1.v1',
      eventVersion: 1,
      tenantId: null,
      workspaceId: null,
      correlationId: 'corr-1',
      idempotencyKey: null,
      payload: {},
      occurredAt: new Date(),
      status: OutboxMessageStatus.PENDING,
      attemptCount: 0,
      availableAt: new Date('2026-05-11T10:00:00Z'),
      publishedAt: null,
      createdAt: new Date('2026-05-11T10:00:00Z'),
      updatedAt: new Date(),
    };
    const candidateTwo = {
      ...candidateOne,
      id: 'msg-002',
      eventId: 'evt-2',
      availableAt: new Date('2026-05-11T10:01:00Z'),
      createdAt: new Date('2026-05-11T10:01:00Z'),
    };
    const claimedOne = { ...candidateOne, status: OutboxMessageStatus.PROCESSING };
    const claimedTwo = { ...candidateTwo, status: OutboxMessageStatus.PROCESSING };

    prismaMock.outboxMessage.findMany.mockResolvedValue([candidateOne, candidateTwo]);
    prismaMock.outboxMessage.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    prismaMock.outboxMessage.findUnique
      .mockResolvedValueOnce(claimedOne)
      .mockResolvedValueOnce(claimedTwo);

    const claimed = await repository.claimPendingBatch(2, new Date('2026-05-11T11:00:00Z'));

    expect(prismaMock.outboxMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: OutboxMessageStatus.PENDING,
        }),
        take: 2,
      }),
    );
    expect(prismaMock.outboxMessage.updateMany).toHaveBeenCalledTimes(2);
    expect(claimed).toHaveLength(2);
    expect(claimed[0]!.status).toBe(OutboxMessageStatus.PROCESSING);
  });

  it('skips already-claimed outbox messages', async () => {
    const candidate = {
      id: 'msg-003',
      eventId: 'evt-3',
      eventName: 'evt.3.v1',
      eventVersion: 1,
      tenantId: null,
      workspaceId: null,
      correlationId: 'corr-3',
      idempotencyKey: null,
      payload: {},
      occurredAt: new Date(),
      status: OutboxMessageStatus.PENDING,
      attemptCount: 0,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.outboxMessage.findMany.mockResolvedValue([candidate]);
    prismaMock.outboxMessage.updateMany.mockResolvedValue({ count: 0 });

    const claimed = await repository.claimPendingBatch(1);

    expect(prismaMock.outboxMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: candidate.id,
          status: OutboxMessageStatus.PENDING,
        },
      }),
    );
    expect(prismaMock.outboxMessage.findUnique).not.toHaveBeenCalled();
    expect(claimed).toHaveLength(0);
  });

  it('respects outbox claim batch limits', async () => {
    const candidates = Array.from({ length: 3 }, (_, index) => ({
      id: `msg-${index + 1}`,
      eventId: `evt-${index + 1}`,
      eventName: `evt.${index + 1}.v1`,
      eventVersion: 1,
      tenantId: null,
      workspaceId: null,
      correlationId: `corr-${index + 1}`,
      idempotencyKey: null,
      payload: {},
      occurredAt: new Date(),
      status: OutboxMessageStatus.PENDING,
      attemptCount: 0,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(Date.now() + index),
      updatedAt: new Date(),
    }));

    // Mock returns 3 items, but claimPendingBatch(2) should only process 2
    prismaMock.outboxMessage.findMany.mockResolvedValue(candidates);
    prismaMock.outboxMessage.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.outboxMessage.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
      candidates.find((candidate) => candidate.id === where.id),
    );

    const claimed = await repository.claimPendingBatch(2);

    expect(claimed).toHaveLength(2);
    expect(prismaMock.outboxMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
    expect(prismaMock.outboxMessage.updateMany).toHaveBeenCalledTimes(2);
  });

  it('returns empty array for limit 0', async () => {
    const claimed = await repository.claimPendingBatch(0);
    expect(claimed).toHaveLength(0);
    expect(prismaMock.outboxMessage.findMany).not.toHaveBeenCalled();
    expect(prismaMock.outboxMessage.updateMany).not.toHaveBeenCalled();
  });

  it('returns empty array for negative limit', async () => {
    const claimed = await repository.claimPendingBatch(-1);
    expect(claimed).toHaveLength(0);
    expect(prismaMock.outboxMessage.findMany).not.toHaveBeenCalled();
    expect(prismaMock.outboxMessage.updateMany).not.toHaveBeenCalled();
  });

  it('markPublished updates status and sets publishedAt', async () => {
    const messageId = 'msg-001';

    await repository.markPublished(messageId);

    expect(prismaMock.outboxMessage.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: {
        status: OutboxMessageStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      },
    });
  });

  it('markFailedOrRetry increments attempt and sets retry time', async () => {
    const messageId = 'msg-001';
    const nextRetry = new Date(Date.now() + 60000);

    const existingRecord = {
      id: messageId,
      attemptCount: 2,
      status: OutboxMessageStatus.PENDING,
      availableAt: new Date(),
    };

    prismaMock.outboxMessage.findUniqueOrThrow.mockResolvedValue(existingRecord);

    await repository.markFailedOrRetry(messageId, nextRetry, 10);

    expect(prismaMock.outboxMessage.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: {
        status: OutboxMessageStatus.PENDING,
        attemptCount: 3,
        availableAt: nextRetry,
      },
    });
  });

  it('markFailedOrRetry marks FAILED when max attempts reached', async () => {
    const messageId = 'msg-001';
    const maxAttempts = 5;

    const existingRecord = {
      id: messageId,
      attemptCount: 4, // Next will be 5, which is max
      status: OutboxMessageStatus.PENDING,
      availableAt: new Date(),
    };

    prismaMock.outboxMessage.findUniqueOrThrow.mockResolvedValue(existingRecord);

    await repository.markFailedOrRetry(messageId, new Date(), maxAttempts);

    expect(prismaMock.outboxMessage.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: {
        status: OutboxMessageStatus.FAILED,
        attemptCount: 5,
        availableAt: expect.any(Date),
      },
    });
  });

  it('uses transaction client when provided', async () => {
    const event: OutboxEvent = {
      eventId: 'tx-evt',
      eventName: 'test.evt',
      eventVersion: 1,
      correlationId: 'corr',
      occurredAt: new Date().toISOString(),
      payload: {},
    };
    const context: RequestContext = { requestId: 'req', correlationId: 'corr', timestamp: new Date().toISOString() };
    const txClient = {
      outboxMessage: {
        create: vi.fn().mockResolvedValue({ id: 'tx-msg', occurredAt: new Date(), createdAt: new Date() }),
      },
    };
    const transaction = { transactionId: 'tx-id', client: txClient };

    await repository.append(event, context, transaction as any);

    expect(txClient.outboxMessage.create).toHaveBeenCalled();
    expect(prismaMock.outboxMessage.create).not.toHaveBeenCalled();
  });
});
