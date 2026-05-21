import { Injectable, Logger } from '@nestjs/common';
import { OutboxRepository } from '@mentrily/data-platform';
import { OutboxRelayRunResult } from '@mentrily/event-catalog';
import { EventDispatcherPort } from './event-dispatcher.port.js';
import { RetryPolicy } from '../queues/retry-policy.js';

@Injectable()
export class OutboxRelayWorker {
  private readonly logger = new Logger(OutboxRelayWorker.name);
  private readonly retryPolicy = new RetryPolicy();

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly eventDispatcher: EventDispatcherPort,
  ) {}

  async runOnce(batchSize = 100, now: Date = new Date()): Promise<OutboxRelayRunResult> {
    const claimed = await this.outboxRepository.claimPendingBatch(batchSize, now);
    let published = 0;
    let retried = 0;
    let failed = 0;

    for (const record of claimed) {
      try {
        await this.eventDispatcher.dispatch(record);
        await this.outboxRepository.markPublished(record.id);
        published += 1;
      } catch (_error) {
        const nextAttemptCount = record.attemptCount + 1;
        const shouldRetry = this.retryPolicy.shouldRetry(nextAttemptCount);
        const nextRetryAt = this.retryPolicy.nextRetryAt(nextAttemptCount, now);

        await this.outboxRepository.markFailedOrRetry(
          record.id,
          shouldRetry ? nextRetryAt : undefined,
          this.retryPolicy.maxAttempts,
        );

        if (shouldRetry) {
          retried += 1;
        } else {
          failed += 1;
        }
      }
    }

    const result: OutboxRelayRunResult = {
      claimed: claimed.length,
      published,
      retried,
      failed,
    };

    this.logger.debug(
      `Outbox relay run completed: claimed=${result.claimed}, published=${result.published}, retried=${result.retried}, failed=${result.failed}`,
    );

    return result;
  }
}
