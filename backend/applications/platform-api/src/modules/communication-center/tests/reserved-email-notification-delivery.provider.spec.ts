import { describe, expect, it, vi } from 'vitest';
import { getSafeNotificationProviderConfig } from '../application/support/index.js';
import { ReservedEmailNotificationDeliveryProvider } from '../infrastructure/index.js';

describe('reserved email notification delivery provider', () => {
  const input = {
    intentId: 'intent-1',
    channel: 'EMAIL' as const,
    recipient: { email: 'learner@example.com' },
    subject: 'Subject',
    body: 'Body',
    metadata: {},
  };

  it('returns provider disabled when delivery is disabled', async () => {
    const provider = new ReservedEmailNotificationDeliveryProvider(getSafeNotificationProviderConfig(), true);
    await expect(provider.deliver(input)).resolves.toMatchObject({
      status: 'FAILED',
      provider: 'RESERVED_EMAIL',
      errorCode: 'PROVIDER_DISABLED',
    });
  });

  it('requires an email recipient and subject', async () => {
    const provider = new ReservedEmailNotificationDeliveryProvider(getSafeNotificationProviderConfig(), true);
    await expect(provider.deliver({ ...input, recipient: {} })).rejects.toThrow(/valid email recipient/i);
    await expect(provider.deliver({ ...input, subject: undefined })).rejects.toThrow(/requires a subject/i);
  });

  it('uses mock transport only when enabled', async () => {
    const transport = {
      send: vi.fn(async () => ({ ok: true, providerMessageId: 'msg-1', metadata: { safe: true } })),
    };
    const provider = new ReservedEmailNotificationDeliveryProvider(
      {
        defaultProvider: 'NOOP',
        emailProvider: 'RESEND_RESERVED',
        featureFlags: { emailProviderEnabled: true, smsProviderEnabled: false, allowLiveDelivery: true },
      },
      true,
      transport,
    );

    await expect(provider.deliver(input)).resolves.toMatchObject({
      status: 'SUCCEEDED',
      provider: 'RESERVED_EMAIL',
      providerMessageId: 'msg-1',
    });
    expect(transport.send).toHaveBeenCalledOnce();
  });
});
