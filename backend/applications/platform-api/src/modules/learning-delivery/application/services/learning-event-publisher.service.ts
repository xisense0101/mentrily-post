import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  OUTBOX_PUBLISHER,
  OutboxPublisher,
  RequestContext,
  TransactionContext,
} from '@mentrily/service-core';
import { LearningDomainEvent } from '../../domain/events/learning-domain-event.js';

@Injectable()
export class LearningEventPublisherService {
  constructor(@Inject(OUTBOX_PUBLISHER) private readonly outbox: OutboxPublisher) {}

  async publishDomainEvent<TPayload extends Record<string, unknown>>(
    domainEvent: LearningDomainEvent<TPayload>,
    context: RequestContext,
    transaction?: TransactionContext,
  ): Promise<void> {
    const outboxEvent = {
      eventId: randomUUID(),
      eventName: domainEvent.eventName,
      eventVersion: domainEvent.eventVersion,
      tenantId: domainEvent.tenantId,
      workspaceId: domainEvent.workspaceId,
      correlationId: context.correlationId,
      idempotencyKey: `${domainEvent.eventName}:${domainEvent.aggregateId}:${domainEvent.eventVersion ?? 1}`,
      occurredAt: domainEvent.occurredAt.toISOString(),
      payload: domainEvent.payload,
    };

    await this.outbox.publish(outboxEvent, context, transaction);
  }
}
