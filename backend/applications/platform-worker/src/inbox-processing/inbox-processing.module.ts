import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { InboxHandlerRegistry } from './inbox-handler-registry.js';
import { InboxProcessingWorker } from './inbox-processing.worker.js';
import { NoopInboxHandler } from './noop-inbox-handler.js';

@Module({
  imports: [DataPlatformModule],
  providers: [InboxProcessingWorker, InboxHandlerRegistry, NoopInboxHandler],
  exports: [InboxProcessingWorker, InboxHandlerRegistry],
})
export class InboxProcessingModule {}
