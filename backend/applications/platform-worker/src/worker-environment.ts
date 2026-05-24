export interface WorkerEnvironment {
  startLoops: boolean;
  outboxBatchSize: number;
  inboxBatchSize: number;
  outboxPollIntervalMs: number;
  inboxPollIntervalMs: number;
  retryBaseDelayMs: number;
  retryMultiplier: number;
  retryMaxDelayMs: number;
  retryMaxAttempts: number;
  communicationDeliveryWorkerEnabled: boolean;
  communicationDeliveryWorkerIntervalMs: number;
  communicationDeliveryWorkerBatchSize: number;
  communicationDeliveryMaxAttempts: number;
  communicationDeliveryRetryBaseMs: number;
}

const DEFAULT_ENVIRONMENT: WorkerEnvironment = {
  startLoops: true,
  outboxBatchSize: 100,
  inboxBatchSize: 100,
  outboxPollIntervalMs: 1000,
  inboxPollIntervalMs: 1000,
  retryBaseDelayMs: 1000,
  retryMultiplier: 2,
  retryMaxDelayMs: 5 * 60 * 1000,
  retryMaxAttempts: 10,
  communicationDeliveryWorkerEnabled: false,
  communicationDeliveryWorkerIntervalMs: 30000,
  communicationDeliveryWorkerBatchSize: 25,
  communicationDeliveryMaxAttempts: 5,
  communicationDeliveryRetryBaseMs: 60000,
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadWorkerEnvironment(env: NodeJS.ProcessEnv = process.env): WorkerEnvironment {
  return {
    startLoops: parseBoolean(env.WORKER_START_LOOPS, DEFAULT_ENVIRONMENT.startLoops),
    outboxBatchSize: parseNumber(env.OUTBOX_BATCH_SIZE, DEFAULT_ENVIRONMENT.outboxBatchSize),
    inboxBatchSize: parseNumber(env.INBOX_BATCH_SIZE, DEFAULT_ENVIRONMENT.inboxBatchSize),
    outboxPollIntervalMs: parseNumber(
      env.OUTBOX_POLL_INTERVAL_MS,
      DEFAULT_ENVIRONMENT.outboxPollIntervalMs,
    ),
    inboxPollIntervalMs: parseNumber(
      env.INBOX_POLL_INTERVAL_MS,
      DEFAULT_ENVIRONMENT.inboxPollIntervalMs,
    ),
    retryBaseDelayMs: parseNumber(env.RETRY_BASE_DELAY_MS, DEFAULT_ENVIRONMENT.retryBaseDelayMs),
    retryMultiplier: parseNumber(env.RETRY_MULTIPLIER, DEFAULT_ENVIRONMENT.retryMultiplier),
    retryMaxDelayMs: parseNumber(env.RETRY_MAX_DELAY_MS, DEFAULT_ENVIRONMENT.retryMaxDelayMs),
    retryMaxAttempts: parseNumber(env.RETRY_MAX_ATTEMPTS, DEFAULT_ENVIRONMENT.retryMaxAttempts),
    communicationDeliveryWorkerEnabled: parseBoolean(
      env.COMMUNICATION_DELIVERY_WORKER_ENABLED,
      DEFAULT_ENVIRONMENT.communicationDeliveryWorkerEnabled,
    ),
    communicationDeliveryWorkerIntervalMs: parseNumber(
      env.COMMUNICATION_DELIVERY_WORKER_INTERVAL_MS,
      DEFAULT_ENVIRONMENT.communicationDeliveryWorkerIntervalMs,
    ),
    communicationDeliveryWorkerBatchSize: parseNumber(
      env.COMMUNICATION_DELIVERY_WORKER_BATCH_SIZE,
      DEFAULT_ENVIRONMENT.communicationDeliveryWorkerBatchSize,
    ),
    communicationDeliveryMaxAttempts: parseNumber(
      env.COMMUNICATION_DELIVERY_MAX_ATTEMPTS,
      DEFAULT_ENVIRONMENT.communicationDeliveryMaxAttempts,
    ),
    communicationDeliveryRetryBaseMs: parseNumber(
      env.COMMUNICATION_DELIVERY_RETRY_BASE_MS,
      DEFAULT_ENVIRONMENT.communicationDeliveryRetryBaseMs,
    ),
  };
}
