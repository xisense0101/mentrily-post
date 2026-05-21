import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxPublisher,
  OutboxEvent,
  RequestContext,
  TransactionContext,
} from '@mentrily/service-core';
import { OutboxRepository } from '@mentrily/data-platform';

/**
 * Concrete outbox publisher implementation.
 *
 * Persists outbox events to PostgreSQL via the OutboxRepository.
 *
 * Responsibilities:
 * - Accept outbox events from use cases
 * - Preserve event envelope fields (eventId, eventName, eventVersion, correlationId, etc.)
 * - Persist to durable outbox table
 * - Initialize status to PENDING for poll-based relay
 * - Never publish externally (that is handled by worker relay processes)
 * - Never silently swallow persistence errors
 *
 * Note: External publication is deferred to worker relay tasks.
 * This adapter only persists to the outbox.
 */
@Injectable()
export class PrismaOutboxPublisher implements OutboxPublisher {
  constructor(@Inject(OutboxRepository) private readonly repository: OutboxRepository) {}

  /**
   * Publish an outbox event.
   *
   * Persists the event to the outbox table with PENDING status.
   * The worker relay will poll and distribute to subscribers.
   *
   * @param event - The outbox event (contains eventId, eventName, version, payload, etc.)
   * @param context - Request context (provides correlationId enrichment)
   * @param transaction - Optional transaction context
   * @throws If persistence fails
   */
  async publish<TPayload>(
    event: OutboxEvent<TPayload>,
    context: RequestContext,
    transaction?: TransactionContext,
  ): Promise<void> {
    await this.repository.append(event, context, transaction);
  }
}
