import { Injectable } from '@nestjs/common';
import type { OutboxRecord } from '@mentrily/service-core';
import { EventDispatcherPort } from './event-dispatcher.port.js';

@Injectable()
export class NoopEventDispatcher extends EventDispatcherPort {
  async dispatch(_record: OutboxRecord): Promise<void> {
    return;
  }
}
