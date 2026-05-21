import type { OutboxRecord } from '@mentrily/service-core';

export abstract class EventDispatcherPort {
  abstract dispatch(record: OutboxRecord): Promise<void>;
}
