import { describe, expect, it } from 'vitest';
import { NotificationDeliveryAttempt } from '../domain/entities/index.js';

describe('NotificationDeliveryAttempt', () => {
  it('marks attempt success and failure strictly', () => {
    const attempt = NotificationDeliveryAttempt.createPending({
      id: '11111111-1111-4111-8111-111111111111',
      intentId: '22222222-2222-4222-8222-222222222222',
      provider: 'FIXTURE',
      attemptNumber: 1,
    });
    expect(attempt.markSucceeded({}).status).toBe('SUCCEEDED');
    expect(attempt.markFailed({ errorMessage: 'boom' }).status).toBe('FAILED');
  });
});
