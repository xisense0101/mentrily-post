import { Injectable, Inject } from '@nestjs/common';
import { InboxRepository } from '@mentrily/data-platform';
import type { OutboxRecord } from '@mentrily/service-core';
import { EventDispatcherPort } from './event-dispatcher.port.js';

@Injectable()
export class InboxEventDispatcher extends EventDispatcherPort {
  constructor(@Inject(InboxRepository) private readonly inboxRepository: InboxRepository) {
    super();
  }

  async dispatch(record: OutboxRecord): Promise<void> {
    await this.inboxRepository.claimOrInsert(
      'platform-outbox',
      record.eventId,
      record.eventName,
      record.payload as Record<string, unknown>,
      record.idempotencyKey ?? undefined,
    );
  }
}
