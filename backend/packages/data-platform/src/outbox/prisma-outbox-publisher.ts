import { Injectable } from '@nestjs/common';
import { OutboxPublisher, OutboxEvent, RequestContext, TransactionContext } from '@mentrily/service-core';
import { OutboxRepository } from './outbox.repository.js';

@Injectable()
export class PrismaOutboxPublisher implements OutboxPublisher {
  constructor(private readonly repository: OutboxRepository) {}

  async publish<TPayload>(
    event: OutboxEvent<TPayload>,
    context: RequestContext,
    transaction?: TransactionContext,
  ): Promise<void> {
    await this.repository.append(event as any, context, transaction);
  }
}
