import { Injectable } from '@nestjs/common';
import type { InboxRecord } from '@mentrily/service-core';

export interface InboxEventHandler {
  handle(record: InboxRecord): Promise<void>;
}

@Injectable()
export class NoopInboxHandler implements InboxEventHandler {
  async handle(_record: InboxRecord): Promise<void> {
    return;
  }
}
