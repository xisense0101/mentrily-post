import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  OUTBOX_PUBLISHER,
  OutboxPublisher,
  RequestContext,
  TransactionContext,
} from '@mentrily/service-core';
import { ContentDomainEvent } from '../../domain/events/index.js';

@Injectable()
export class ContentEventPublisherService {
  constructor(@Inject(OUTBOX_PUBLISHER) private readonly outbox: OutboxPublisher) {}

  async publishDomainEvent<TPayload extends Record<string, unknown>>(
    domainEvent: ContentDomainEvent<TPayload>,
    context: RequestContext,
    transaction?: TransactionContext,
  ): Promise<void> {
    await this.outbox.publish(
      {
        eventId: randomUUID(),
        eventName: domainEvent.eventName,
        eventVersion: domainEvent.eventVersion,
        tenantId: domainEvent.tenantId,
        workspaceId: domainEvent.workspaceId,
        correlationId: context.correlationId,
        idempotencyKey: `${domainEvent.eventName}:${domainEvent.aggregateId}:${domainEvent.eventVersion}:${domainEvent.occurredAt.toISOString()}`,
        occurredAt: domainEvent.occurredAt.toISOString(),
        payload: domainEvent.payload,
      },
      context,
      transaction,
    );
  }
}
