import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { InboxProcessingModule } from './inbox-processing/inbox-processing.module.js';
import { OutboxRelayModule } from './outbox-relay/outbox-relay.module.js';
import { MediaProcessingModule } from './media-processing/media-processing.module.js';

@Module({
  imports: [DataPlatformModule, OutboxRelayModule, InboxProcessingModule, MediaProcessingModule],
})
export class WorkerModule {}

