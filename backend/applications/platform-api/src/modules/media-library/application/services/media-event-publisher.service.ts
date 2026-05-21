import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  OUTBOX_PUBLISHER,
  OutboxPublisher,
  RequestContext,
  TransactionContext,
} from '@mentrily/service-core';
import type { MediaDomainEvent } from '../../domain/events/index.js';

@Injectable()
export class MediaEventPublisherService {
  constructor(@Inject(OUTBOX_PUBLISHER) private readonly outbox: OutboxPublisher) {}

  async publishDomainEvent<TPayload extends Record<string, unknown>>(
    event: MediaDomainEvent<TPayload>,
    context: RequestContext,
    transaction?: TransactionContext,
  ): Promise<void> {
    await this.outbox.publish(
      {
        eventId: randomUUID(),
        eventName: event.eventName,
        eventVersion: event.eventVersion,
        tenantId: event.tenantId,
        workspaceId: event.workspaceId,
        correlationId: context.correlationId,
        idempotencyKey: `${event.eventName}:${event.aggregateId}:${event.occurredAt.toISOString()}`,
        occurredAt: event.occurredAt.toISOString(),
        payload: event.payload,
      },
      context,
      transaction,
    );
  }
}
