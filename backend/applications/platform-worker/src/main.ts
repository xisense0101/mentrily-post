import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadWorkerEnvironment } from './worker-environment.js';
import { createShutdownSignal } from './queues/shutdown-signal.js';
import { startWorkerLoop } from './queues/worker-loop.js';
import { InboxProcessingWorker } from './inbox-processing/inbox-processing.worker.js';
import { OutboxRelayWorker } from './outbox-relay/outbox-relay.worker.js';
import { WorkerModule } from './worker.module.js';

async function bootstrapWorker(): Promise<void> {
  const logger = new Logger('platform-worker');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  const environment = loadWorkerEnvironment();
  logger.log('platform-worker application context initialized');

  if (!environment.startLoops) {
    logger.log('worker loops are disabled; exiting after bootstrap');
    await app.close();
    return;
  }

  const shutdown = createShutdownSignal();
  shutdown.register();

  const outboxRelayWorker = app.get(OutboxRelayWorker);
  const inboxProcessingWorker = app.get(InboxProcessingWorker);

  const outboxLoop = startWorkerLoop(
    async () => {
      await outboxRelayWorker.runOnce(environment.outboxBatchSize);
    },
    {
      intervalMs: environment.outboxPollIntervalMs,
      signal: shutdown.signal,
    },
  );

  const inboxLoop = startWorkerLoop(
    async () => {
      await inboxProcessingWorker.runOnce(environment.inboxBatchSize);
    },
    {
      intervalMs: environment.inboxPollIntervalMs,
      signal: shutdown.signal,
    },
  );

  logger.log('worker loops started');

  try {
    await Promise.all([outboxLoop.completion, inboxLoop.completion]);
  } finally {
    shutdown.dispose();
    await app.close();
  }
}

void bootstrapWorker().catch((error: unknown) => {
  const logger = new Logger('platform-worker');
  logger.error('platform-worker bootstrap failed', error instanceof Error ? error.stack : undefined);
  process.exitCode = 1;
});
