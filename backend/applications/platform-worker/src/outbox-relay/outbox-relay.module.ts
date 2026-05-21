import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { EventDispatcherPort } from './event-dispatcher.port.js';
import { NoopEventDispatcher } from './noop-event-dispatcher.js';
import { OutboxRelayWorker } from './outbox-relay.worker.js';

@Module({
  imports: [DataPlatformModule],
  providers: [
    OutboxRelayWorker,
    {
      provide: EventDispatcherPort,
      useClass: NoopEventDispatcher,
    },
  ],
  exports: [OutboxRelayWorker, EventDispatcherPort],
})
export class OutboxRelayModule {}
