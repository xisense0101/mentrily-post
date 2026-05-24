import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadWorkerEnvironment } from './worker-environment.js';
import { createShutdownSignal } from './queues/shutdown-signal.js';
import { startWorkerLoop } from './queues/worker-loop.js';
import { InboxProcessingWorker } from './inbox-processing/inbox-processing.worker.js';
import { OutboxRelayWorker } from './outbox-relay/outbox-relay.worker.js';
import { MediaProcessingWorker } from './media-processing/media-processing.worker.js';
import { MediaSecurityScanWorker } from './media-processing/media-security-scan.worker.js';
import { MediaLifecycleWorker } from './media-processing/media-lifecycle.worker.js';
import { CommunicationDeliveryWorker } from './communication-delivery/communication-delivery.worker.js';
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
  const mediaProcessingWorker = app.get(MediaProcessingWorker);
  const mediaSecurityScanWorker = app.get(MediaSecurityScanWorker);
  const mediaLifecycleWorker = app.get(MediaLifecycleWorker);
  const communicationDeliveryWorker = app.get(CommunicationDeliveryWorker);

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

  const mediaLoop = startWorkerLoop(
    async () => {
      await mediaProcessingWorker.runOnce(10); // Hardcoded batch size for now
    },
    {
      intervalMs: 5000, // Hardcoded poll interval for now
      signal: shutdown.signal,
    },
  );

  const securityScanLoop = startWorkerLoop(
    async () => {
      await mediaSecurityScanWorker.runOnce(10);
    },
    {
      intervalMs: 5000,
      signal: shutdown.signal,
    },
  );

  const lifecycleLoop = startWorkerLoop(
    async () => {
      await mediaLifecycleWorker.runOnce(10);
    },
    {
      intervalMs: 5000,
      signal: shutdown.signal,
    },
  );

  const loops: Promise<void>[] = [
    outboxLoop.completion,
    inboxLoop.completion,
    mediaLoop.completion,
    securityScanLoop.completion,
    lifecycleLoop.completion,
  ];

  if (environment.communicationDeliveryWorkerEnabled) {
    const communicationLoop = startWorkerLoop(
      async () => {
        await communicationDeliveryWorker.runOnce(environment.communicationDeliveryWorkerBatchSize);
      },
      {
        intervalMs: environment.communicationDeliveryWorkerIntervalMs,
        signal: shutdown.signal,
      },
    );
    loops.push(communicationLoop.completion);
    logger.log('communication delivery worker loop started');
  } else {
    logger.log('communication delivery worker loop is disabled');
  }

  logger.log('worker loops started');

  try {
    await Promise.all(loops);
  } finally {
    shutdown.dispose();
    await app.close();
  }
}

void bootstrapWorker().catch((error: unknown) => {
  const logger = new Logger('platform-worker');
  logger.error(
    'platform-worker bootstrap failed',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
