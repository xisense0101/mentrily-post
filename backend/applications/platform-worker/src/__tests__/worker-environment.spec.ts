import { describe, expect, it } from 'vitest';
import { loadWorkerEnvironment } from '../worker-environment.js';

describe('worker environment config parsing', () => {
  it('uses defaults when env is empty', () => {
    const config = loadWorkerEnvironment({});
    expect(config.communicationDeliveryWorkerEnabled).toBe(false);
    expect(config.communicationDeliveryWorkerIntervalMs).toBe(30000);
    expect(config.communicationDeliveryWorkerBatchSize).toBe(25);
    expect(config.communicationDeliveryMaxAttempts).toBe(5);
    expect(config.communicationDeliveryRetryBaseMs).toBe(60000);
  });

  it('correctly overrides default values', () => {
    const config = loadWorkerEnvironment({
      COMMUNICATION_DELIVERY_WORKER_ENABLED: 'true',
      COMMUNICATION_DELIVERY_WORKER_INTERVAL_MS: '15000',
      COMMUNICATION_DELIVERY_WORKER_BATCH_SIZE: '50',
      COMMUNICATION_DELIVERY_MAX_ATTEMPTS: '8',
      COMMUNICATION_DELIVERY_RETRY_BASE_MS: '120000',
    });
    expect(config.communicationDeliveryWorkerEnabled).toBe(true);
    expect(config.communicationDeliveryWorkerIntervalMs).toBe(15000);
    expect(config.communicationDeliveryWorkerBatchSize).toBe(50);
    expect(config.communicationDeliveryMaxAttempts).toBe(8);
    expect(config.communicationDeliveryRetryBaseMs).toBe(120000);
  });
});
