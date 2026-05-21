import { Injectable, Logger } from '@nestjs/common';
import { InboxRepository } from '@mentrily/data-platform';
import { InboxProcessingRunResult } from '@mentrily/event-catalog';
import { InboxHandlerRegistry } from './inbox-handler-registry.js';

@Injectable()
export class InboxProcessingWorker {
  private readonly logger = new Logger(InboxProcessingWorker.name);

  constructor(
    private readonly inboxRepository: InboxRepository,
    private readonly handlerRegistry: InboxHandlerRegistry,
  ) {}

  async runOnce(batchSize = 100): Promise<InboxProcessingRunResult> {
    const claimed = await this.inboxRepository.claimReceivedBatch(batchSize);
    let processed = 0;
    let failed = 0;

    for (const record of claimed) {
      const handler = this.handlerRegistry.resolve(record.eventName);

      try {
        await handler.handle(record);
        await this.inboxRepository.markProcessed(record.id);
        processed += 1;
      } catch (_error) {
        await this.inboxRepository.markFailed(record.id);
        failed += 1;
      }
    }

    const result: InboxProcessingRunResult = {
      claimed: claimed.length,
      processed,
      failed,
    };

    this.logger.debug(
      `Inbox processing run completed: claimed=${result.claimed}, processed=${result.processed}, failed=${result.failed}`,
    );

    return result;
  }
}
