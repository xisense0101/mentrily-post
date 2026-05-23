import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type {
  InboxRecord,
  InboxClaimResult,
  InboxMessageStatus,
  TransactionContext,
} from '@mentrily/service-core';
import { InboxMessageStatus as InboxMessageStatusDB, Prisma } from '@prisma/client';
import type { InboxMessage as PrismaInboxMessage } from '@prisma/client';
import { createHash } from 'crypto';
import { getPrismaClient } from '../transactions/transaction-client.js';

/**
 * Database repository for durable inbox messages.
 *
 * Responsibilities:
 * - Persist inbound external events for deduplication
 * - Enforce idempotency by (source + externalEventId)
 * - Detect and handle duplicate inbound events
 * - Track processing status and completion
 */
@Injectable()
export class InboxRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Claim or create an inbound event record.
   *
   * Idempotency rule: Events are deduped by (source + externalEventId).
   * If already exists, returns the existing record with wasClaimed=false.
   * If new, inserts and returns with wasClaimed=true.
   *
   * @param source - Source identifier (e.g., 'stripe', 'webhook-partner-x')
   * @param externalEventId - Source event ID
   * @param eventName - Internal event name
   * @param payload - Event payload (used to compute payloadHash)
   * @param idempotencyKey - Optional additional idempotency key
   * @returns InboxClaimResult with record and wasClaimed flag
   */
  async claimOrInsert(
    source: string,
    externalEventId: string,
    eventName: string,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
    transaction?: TransactionContext,
  ): Promise<InboxClaimResult> {
    const client = getPrismaClient(this.prisma, transaction);
    const payloadHash = this.computePayloadHash(payload);

    try {
      const record = await client.inboxMessage.create({
        data: {
          source,
          externalEventId,
          eventName,
          idempotencyKey: idempotencyKey ?? null,
          payloadHash,
          status: InboxMessageStatusDB.RECEIVED,
          receivedAt: new Date(),
        },
      });

      return {
        wasClaimed: true,
        record: this.mapToContract(record),
      };
    } catch (error) {
      // Prisma may report the compound unique target as either:
      // - ['source_externalEventId_key']
      // - ['source', 'externalEventId']
      // On any P2002, resolve the existing row by the logical key.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.findBySourceAndExternalId(source, externalEventId, transaction);

        if (existing) {
          return {
            wasClaimed: false,
            record: existing,
          };
        }
      }

      throw error;
    }
  }

  /**
   * Find an inbox message by ID.
   *
   * @param messageId - The inbox message ID
   * @returns The inbox record or null if not found
   */
  async findById(messageId: string, transaction?: TransactionContext): Promise<InboxRecord | null> {
    const client = getPrismaClient(this.prisma, transaction);
    const record = await client.inboxMessage.findUnique({
      where: { id: messageId },
    });

    return record ? this.mapToContract(record) : null;
  }

  /**
   * Find an inbox message by source and external event ID.
   *
   * @param source - Source identifier
   * @param externalEventId - Source event ID
   * @returns The inbox record or null if not found
   */
  async findBySourceAndExternalId(
    source: string,
    externalEventId: string,
    transaction?: TransactionContext,
  ): Promise<InboxRecord | null> {
    const client = getPrismaClient(this.prisma, transaction);
    const record = await client.inboxMessage.findUnique({
      where: {
        source_externalEventId: {
          source,
          externalEventId,
        },
      },
    });

    return record ? this.mapToContract(record) : null;
  }

  /**
   * Mark a message as being processed.
   *
   * @param messageId - The inbox message ID
   */
  async markProcessing(messageId: string, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    await client.inboxMessage.update({
      where: { id: messageId },
      data: {
        status: InboxMessageStatusDB.PROCESSING,
      },
    });
  }

  /**
   * Mark a message as successfully processed.
   *
   * @param messageId - The inbox message ID
   */
  async markProcessed(messageId: string, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    await client.inboxMessage.update({
      where: { id: messageId },
      data: {
        status: InboxMessageStatusDB.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark a message as failed.
   *
   * @param messageId - The inbox message ID
   */
  async markFailed(messageId: string, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    await client.inboxMessage.update({
      where: { id: messageId },
      data: {
        status: InboxMessageStatusDB.FAILED,
      },
    });
  }

  /**
   * Claim a batch of received inbox messages for processing.
   *
   * Claims are conditional and safe for multiple workers:
   * - only RECEIVED rows are eligible
   * - oldest messages are claimed first
   * - rows already claimed by another worker are skipped
   *
   * @param limit - Maximum number of rows to claim
   * @returns Claimed inbox records in PROCESSING state
   */
  async claimReceivedBatch(
    limit: number,
    transaction?: TransactionContext,
  ): Promise<InboxRecord[]> {
    if (limit <= 0) {
      return [];
    }

    const client = getPrismaClient(this.prisma, transaction);
    const candidates = await client.inboxMessage.findMany({
      where: {
        status: InboxMessageStatusDB.RECEIVED,
      },
      orderBy: [{ receivedAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    const claimed: InboxRecord[] = [];

    for (const candidate of candidates.slice(0, limit)) {
      const result = await client.inboxMessage.updateMany({
        where: {
          id: candidate.id,
          status: InboxMessageStatusDB.RECEIVED,
        },
        data: {
          status: InboxMessageStatusDB.PROCESSING,
        },
      });

      if (result.count !== 1) {
        continue;
      }

      const claimedRecord = await client.inboxMessage.findUnique({
        where: { id: candidate.id },
      });

      if (claimedRecord) {
        claimed.push(this.mapToContract(claimedRecord));
      }
    }

    return claimed;
  }

  /**
   * Find all messages with a given status.
   *
   * Useful for polling/worker processes.
   *
   * @param status - The status to filter by
   * @param limit - Maximum number of records to return
   * @returns Array of inbox records
   */
  async findByStatus(
    status: InboxMessageStatus,
    limit: number,
    transaction?: TransactionContext,
  ): Promise<InboxRecord[]> {
    const client = getPrismaClient(this.prisma, transaction);
    const records = await client.inboxMessage.findMany({
      where: { status: status as InboxMessageStatusDB },
      orderBy: { receivedAt: 'asc' },
      take: limit,
    });

    return records.map((r) => this.mapToContract(r));
  }

  /**
   * Compute SHA256 hash of payload for change detection.
   *
   * @param payload - The payload to hash
   * @returns Hex string of SHA256 hash
   */
  private computePayloadHash(payload: Record<string, unknown>): string {
    const serialized = JSON.stringify(payload);
    return createHash('sha256').update(serialized).digest('hex');
  }

  private mapToContract(record: PrismaInboxMessage): InboxRecord {
    return {
      id: record.id,
      source: record.source,
      externalEventId: record.externalEventId,
      eventName: record.eventName,
      idempotencyKey: record.idempotencyKey,
      payloadHash: record.payloadHash,
      status: record.status as InboxMessageStatus,
      receivedAt: record.receivedAt,
      processedAt: record.processedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
