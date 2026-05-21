import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RequestContext, OutboxEvent } from '@mentrily/service-core';
import { PrismaOutboxPublisher } from '../concrete-adapters/prisma-outbox-publisher.adapter.js';

describe('PrismaOutboxPublisher', () => {
  let publisher: PrismaOutboxPublisher;
  let repositoryMock: any;

  beforeEach(() => {
    repositoryMock = {
      append: vi.fn(),
    };
    publisher = new PrismaOutboxPublisher(repositoryMock);
  });

  it('delegates publish() to repository.append()', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-789',
      eventName: 'identity.membership.granted.v1',
      eventVersion: 1,
      tenantId: 'tenant-001',
      workspaceId: 'ws-001',
      correlationId: 'corr-xyz',
      idempotencyKey: 'idempotency-key-123',
      occurredAt: new Date().toISOString(),
      payload: {
        principalId: 'principal-123',
        roleKey: 'member',
      },
    };

    const context: RequestContext = {
      requestId: 'req-001',
      correlationId: 'corr-xyz',
      timestamp: new Date().toISOString(),
      workspace: {
        tenantId: 'tenant-001',
        workspaceId: 'ws-001',
        actorId: 'actor-123',
      },
    };

    const mockOutboxRecord = {
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
      status: 'PENDING',
      attemptCount: 0,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repositoryMock.append.mockResolvedValue(mockOutboxRecord);

    await publisher.publish(event, context);

    expect(repositoryMock.append).toHaveBeenCalledWith(event, context, undefined);
  });

  it('preserves event envelope fields', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-unique-123',
      eventName: 'commercial.entitlement.changed.v1',
      eventVersion: 2,
      workspaceId: 'ws-999',
      correlationId: 'corr-distributed-trace',
      idempotencyKey: 'idempotency-deterministic',
      occurredAt: '2026-05-11T10:30:00Z',
      payload: { entitlementKey: 'white_label', enabled: true },
    };

    const context: RequestContext = {
      requestId: 'req-001',
      correlationId: 'corr-distributed-trace',
      timestamp: new Date().toISOString(),
    };

    const mockOutboxRecord = {
      id: 'msg-002',
      eventId: event.eventId,
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      tenantId: null,
      workspaceId: event.workspaceId,
      correlationId: event.correlationId,
      idempotencyKey: event.idempotencyKey,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
      status: 'PENDING',
      attemptCount: 0,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repositoryMock.append.mockResolvedValue(mockOutboxRecord);

    await publisher.publish(event, context);

    // Verify all envelope fields are passed through
    expect(repositoryMock.append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt-unique-123',
        eventName: 'commercial.entitlement.changed.v1',
        eventVersion: 2,
        workspaceId: 'ws-999',
        correlationId: 'corr-distributed-trace',
        idempotencyKey: 'idempotency-deterministic',
        occurredAt: '2026-05-11T10:30:00Z',
        payload: { entitlementKey: 'white_label', enabled: true },
      }),
      context,
      undefined,
    );
  });

  it('keeps event correlationId distinct from request correlationId', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-corr-001',
      eventName: 'commercial.entitlement.changed.v1',
      eventVersion: 1,
      correlationId: 'corr-from-event',
      occurredAt: new Date().toISOString(),
      payload: { entitlementKey: 'white_label', enabled: true },
    };

    const context: RequestContext = {
      requestId: 'req-002',
      correlationId: 'corr-from-request',
      timestamp: new Date().toISOString(),
    };

    repositoryMock.append.mockResolvedValue({
      id: 'msg-003',
      eventId: event.eventId,
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      tenantId: null,
      workspaceId: null,
      correlationId: event.correlationId,
      idempotencyKey: null,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
      status: 'PENDING',
      attemptCount: 0,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await publisher.publish(event, context);

    expect(repositoryMock.append).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'corr-from-event',
      }),
      context,
      undefined,
    );
  });

  it('does not publish externally (only persists to outbox)', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-001',
      eventName: 'test.event.v1',
      eventVersion: 1,
      correlationId: 'corr-001',
      occurredAt: new Date().toISOString(),
      payload: { data: 'test' },
    };

    const context: RequestContext = {
      requestId: 'req-001',
      correlationId: 'corr-001',
      timestamp: new Date().toISOString(),
    };

    const mockRecord = {
      id: 'msg-001',
      eventId: event.eventId,
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      tenantId: null,
      workspaceId: null,
      correlationId: event.correlationId,
      idempotencyKey: null,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
      status: 'PENDING',
      attemptCount: 0,
      availableAt: new Date(),
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repositoryMock.append.mockResolvedValue(mockRecord);

    await publisher.publish(event, context);

    // Verify only persistence was called, not external publish
    expect(repositoryMock.append).toHaveBeenCalledTimes(1);
    // No external publishing should occur
    expect(mockRecord.publishedAt).toBeNull();
  });

  it('propagates repository errors', async () => {
    const event: OutboxEvent = {
      eventId: 'evt-001',
      eventName: 'test.event.v1',
      eventVersion: 1,
      correlationId: 'corr-001',
      occurredAt: new Date().toISOString(),
      payload: {},
    };

    const context: RequestContext = {
      requestId: 'req-001',
      correlationId: 'corr-001',
      timestamp: new Date().toISOString(),
    };

    const dbError = new Error('Database connection failed');
    repositoryMock.append.mockRejectedValue(dbError);

    await expect(publisher.publish(event, context)).rejects.toThrow('Database connection failed');
  });

  it('passes transaction context to repository', async () => {
    const event: OutboxEvent = {
      eventId: 'tx-evt',
      eventName: 'test.evt',
      eventVersion: 1,
      correlationId: 'corr',
      occurredAt: new Date().toISOString(),
      payload: {},
    };
    const context: RequestContext = {
      requestId: 'req',
      correlationId: 'corr',
      timestamp: new Date().toISOString(),
    };
    const transaction = { transactionId: 'tx-id', client: {} };

    await publisher.publish(event, context, transaction as any);

    expect(repositoryMock.append).toHaveBeenCalledWith(event, context, transaction);
  });
});
