import { describe, expect, it } from 'vitest';
import { NotificationIntent } from '../domain/entities/index.js';

describe('NotificationIntent', () => {
  it('creates queued intent and enforces terminal transitions', () => {
    const intent = NotificationIntent.createQueued({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '33333333-3333-4333-8333-333333333333',
      channel: 'EMAIL',
      recipient: { email: 'user@example.com' },
      subject: 'Subject',
      body: 'Body',
      provider: 'NOOP',
      createdByPrincipalId: '44444444-4444-4444-8444-444444444444',
    });
    const dispatched = intent.markDispatched({});
    expect(dispatched.status).toBe('DISPATCHED');
    expect(() => dispatched.markFailed({ failureReason: 'x' })).toThrow(/cannot be marked failed/);
  });
});
