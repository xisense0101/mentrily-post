import { describe, expect, it } from 'vitest';
import { NotificationDeliveryAttempt, NotificationIntent } from '../domain/entities/index.js';
import { NotificationSchedulerPolicyService } from '../domain/services/index.js';

describe('NotificationSchedulerPolicyService', () => {
  const policy = new NotificationSchedulerPolicyService();
  const now = new Date('2026-05-21T10:00:00.000Z');

  const createQueuedIntent = (overrides: Partial<ConstructorParameters<typeof NotificationIntent>[0]> = {}) =>
    new NotificationIntent({
      id: 'intent-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      channel: 'EMAIL',
      recipient: { email: 'user@example.com' },
      subject: 'Subject',
      body: 'Body',
      priority: 'NORMAL',
      status: 'QUEUED',
      provider: 'NOOP',
      metadata: {},
      createdByPrincipalId: 'creator-1',
      createdAt: new Date('2026-05-21T09:00:00.000Z'),
      updatedAt: new Date('2026-05-21T09:00:00.000Z'),
      queuedAt: new Date('2026-05-21T09:00:00.000Z'),
      ...overrides,
    });

  const createAttempt = (attemptNumber: number) =>
    NotificationDeliveryAttempt.createPending({
      id: `attempt-${attemptNumber}`,
      intentId: 'intent-1',
      provider: 'NOOP',
      attemptNumber,
      createdAt: new Date(`2026-05-21T09:0${attemptNumber}:00.000Z`),
    });

  it('treats an immediate queued intent as due', () => {
    expect(
      policy.evaluate({
        intent: createQueuedIntent(),
        attempts: [],
        now,
        recipientValid: true,
      }),
    ).toEqual({ eligible: true });
  });

  it('treats a queued future scheduled intent as not due', () => {
    expect(
      policy.evaluate({
        intent: createQueuedIntent({ scheduledFor: new Date('2026-05-21T11:00:00.000Z') }),
        attempts: [],
        now,
        recipientValid: true,
      }),
    ).toEqual({ eligible: false, reason: 'NOT_DUE' });
  });

  it('treats a queued past scheduled intent as due', () => {
    expect(
      policy.evaluate({
        intent: createQueuedIntent({ scheduledFor: new Date('2026-05-21T09:30:00.000Z') }),
        attempts: [],
        now,
        recipientValid: true,
      }),
    ).toEqual({ eligible: true });
  });

  it('rejects draft, cancelled, failed, and dispatched intents', () => {
    for (const status of ['DRAFT', 'CANCELLED', 'FAILED', 'DISPATCHED'] as const) {
      expect(
        policy.evaluate({
          intent: createQueuedIntent({ status }),
          attempts: [],
          now,
          recipientValid: true,
        }).eligible,
      ).toBe(false);
    }
  });

  it('rejects invalid recipients', () => {
    expect(
      policy.evaluate({
        intent: createQueuedIntent({ recipient: {} }),
        attempts: [],
        now,
        recipientValid: false,
      }),
    ).toEqual({ eligible: false, reason: 'INVALID_RECIPIENT' });
  });

  it('enforces the conservative max attempt limit', () => {
    expect(
      policy.evaluate({
        intent: createQueuedIntent(),
        attempts: [createAttempt(1), createAttempt(2), createAttempt(3)],
        now,
        recipientValid: true,
      }),
    ).toEqual({ eligible: false, reason: 'MAX_ATTEMPTS_REACHED' });
  });
});
