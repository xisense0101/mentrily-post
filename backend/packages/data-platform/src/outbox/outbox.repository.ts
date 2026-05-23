import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type {
  OutboxRecord,
  OutboxEvent,
  RequestContext,
  TransactionContext,
} from '@mentrily/service-core';
import { OutboxMessageStatus as ContractOutboxMessageStatus } from '@mentrily/service-core';
import { OutboxMessageStatus as OutboxMessageStatusDB, Prisma } from '@prisma/client';
import type { OutboxMessage as PrismaOutboxMessage } from '@prisma/client';
import { getPrismaClient } from '../transactions/transaction-client.js';

export function isUniqueEventIdViolation(error: unknown): boolean {
  if (
    !error ||
    typeof error !== 'object' ||
    !('code' in error) ||
    (error as { code?: unknown }).code !== 'P2002'
  ) {
    return false;
  }

  const target = (error as { meta?: { target?: unknown } }).meta?.target;

  if (typeof target === 'string') {
    return target === 'eventId' || target === 'OutboxMessage_eventId_key';
  }

  if (Array.isArray(target)) {
    return target.some((value) => value === 'eventId' || value === 'OutboxMessage_eventId_key');
  }

  return false;
}

function isUnknownUniqueViolation(error: unknown): boolean {
  if (
    !error ||
    typeof error !== 'object' ||
    !('code' in error) ||
    (error as { code?: unknown }).code !== 'P2002'
  ) {
    return false;
  }

  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  return target === undefined || target === null;
}

/**
 * Database repository for durable outbox messages.
 *
 * Responsibilities:
 * - Persist outbox messages for reliable cross-module/async event propagation
 * - Provide polling/relay operations for worker-based event distribution
 * - Track retry attempts and publication status
 * - Never publish externally (relay is handled by workers)
 */
@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append a new outbox message.
   *
   * Persists the event with PENDING status, ready for relay.
   * Initializes attemptCount to 0 and availableAt to now.
   *
   * @param event - Outbox event from use case
   * @param context - Request context (provides correlationId)
   * @returns The persisted outbox record
   */
  async append<TPayload>(
    event: OutboxEvent<TPayload>,
    context: RequestContext,
    transaction?: TransactionContext,
  ): Promise<OutboxRecord> {
    const client = getPrismaClient(this.prisma, transaction);
    void context;

    try {
      const record = await client.outboxMessage.create({
        data: {
          eventId: event.eventId,
          eventName: event.eventName,
          eventVersion: event.eventVersion,
          tenantId: event.tenantId ?? null,
          workspaceId: event.workspaceId ?? null,
          correlationId: event.correlationId,
          idempotencyKey: event.idempotencyKey ?? null,
          payload: event.payload as Prisma.InputJsonValue,
          occurredAt: new Date(event.occurredAt),
          status: OutboxMessageStatusDB.PENDING,
          attemptCount: 0,
          availableAt: new Date(),
        },
      });

      return this.mapToContract(record);
    } catch (error) {
      if (isUniqueEventIdViolation(error) || isUnknownUniqueViolation(error)) {
        const existing = await client.outboxMessage.findUnique({
          where: { eventId: event.eventId },
        });

        if (existing) {
          return this.mapToContract(existing);
        }
      }

      throw error;
    }
  }

  /**
   * Find pending outbox messages available for relay.
   *
   * Used by worker relay processes to poll for messages.
   * Respects availableAt for delayed/retry scheduling.
   *
   * @param limit - Maximum number of messages to return
   * @param availableAfter - Only return messages available before this time
   * @returns Array of pending outbox records
   */
  async findPending(
    limit: number,
    availableAfter?: Date,
    transaction?: TransactionContext,
  ): Promise<OutboxRecord[]> {
    const client = getPrismaClient(this.prisma, transaction);
    const queryTime = availableAfter ?? new Date();

    const records = await client.outboxMessage.findMany({
      where: {
        status: OutboxMessageStatusDB.PENDING,
        availableAt: {
          lte: queryTime,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });

    return records.map((r) => this.mapToContract(r));
  }

  /**
   * Claim a batch of pending outbox messages for relay.
   *
   * Claims are conditional and safe for multiple workers:
   * - only PENDING rows are eligible
   * - oldest messages are claimed first
   * - rows already claimed by another worker are skipped
   *
   * @param limit - Maximum number of rows to claim
   * @param now - Reference time used to filter available messages
   * @returns Claimed outbox records in PROCESSING state
   */
  async claimPendingBatch(
    limit: number,
    now: Date = new Date(),
    transaction?: TransactionContext,
  ): Promise<OutboxRecord[]> {
    if (limit <= 0) {
      return [];
    }

    const client = getPrismaClient(this.prisma, transaction);
    const candidates = await client.outboxMessage.findMany({
      where: {
        status: OutboxMessageStatusDB.PENDING,
        availableAt: {
          lte: now,
        },
      },
      orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    const claimed: OutboxRecord[] = [];

    for (const candidate of candidates.slice(0, limit)) {
      const result = await client.outboxMessage.updateMany({
        where: {
          id: candidate.id,
          status: OutboxMessageStatusDB.PENDING,
        },
        data: {
          status: OutboxMessageStatusDB.PROCESSING,
        },
      });

      if (result.count !== 1) {
        continue;
      }

      const claimedRecord = await client.outboxMessage.findUnique({
        where: { id: candidate.id },
      });

      if (claimedRecord) {
        claimed.push(this.mapToContract(claimedRecord));
      }
    }

    return claimed;
  }

  /**
   * Mark a message as being processed.
   *
   * @param messageId - The outbox message ID
   */
  async markProcessing(messageId: string, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    await client.outboxMessage.update({
      where: { id: messageId },
      data: {
        status: OutboxMessageStatusDB.PROCESSING,
      },
    });
  }

  /**
   * Mark a message as successfully published.
   *
   * @param messageId - The outbox message ID
   */
  async markPublished(messageId: string, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    await client.outboxMessage.update({
      where: { id: messageId },
      data: {
        status: OutboxMessageStatusDB.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  /**
   * Mark a message as failed and increment attempt count.
   *
   * Sets availableAt to a future time for retry backoff (caller can apply exponential backoff).
   * After max attempts, should be transitioned to FAILED status.
   *
   * @param messageId - The outbox message ID
   * @param nextRetryAfter - When to retry (or null to keep current availableAt)
   * @param maxAttempts - Maximum attempts before marking FAILED
   */
  async markFailedOrRetry(
    messageId: string,
    nextRetryAfter?: Date,
    maxAttempts: number = 10,
    transaction?: TransactionContext,
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    const record = await client.outboxMessage.findUniqueOrThrow({
      where: { id: messageId },
    });

    const newAttemptCount = record.attemptCount + 1;
    const newStatus =
      newAttemptCount >= maxAttempts ? OutboxMessageStatusDB.FAILED : OutboxMessageStatusDB.PENDING;

    await client.outboxMessage.update({
      where: { id: messageId },
      data: {
        status: newStatus,
        attemptCount: newAttemptCount,
        availableAt: nextRetryAfter ?? record.availableAt,
      },
    });
  }

  /**
   * Find a single outbox message by ID.
   *
   * @param messageId - The outbox message ID
   * @returns The outbox record or null if not found
   */
  async findById(
    messageId: string,
    transaction?: TransactionContext,
  ): Promise<OutboxRecord | null> {
    const client = getPrismaClient(this.prisma, transaction);
    const record = await client.outboxMessage.findUnique({
      where: { id: messageId },
    });

    return record ? this.mapToContract(record) : null;
  }

  private mapToContract(record: PrismaOutboxMessage): OutboxRecord {
    return {
      id: record.id,
      eventId: record.eventId,
      eventName: record.eventName,
      eventVersion: record.eventVersion,
      tenantId: record.tenantId,
      workspaceId: record.workspaceId,
      correlationId: record.correlationId,
      idempotencyKey: record.idempotencyKey,
      payload: record.payload as Record<string, unknown>,
      occurredAt: record.occurredAt,
      status: record.status as unknown as ContractOutboxMessageStatus,
      attemptCount: record.attemptCount,
      availableAt: record.availableAt,
      publishedAt: record.publishedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
