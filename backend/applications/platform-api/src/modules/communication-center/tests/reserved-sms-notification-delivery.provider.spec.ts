import { describe, expect, it, vi } from 'vitest';
import { getSafeNotificationProviderConfig } from '../application/support/index.js';
import { ReservedSmsNotificationDeliveryProvider } from '../infrastructure/index.js';

describe('reserved sms notification delivery provider', () => {
  const input = {
    intentId: 'intent-1',
    channel: 'SMS' as const,
    recipient: { phoneNumber: '+15555550123' },
    body: 'Body',
    metadata: {},
  };

  it('returns provider disabled when delivery is disabled', async () => {
    const provider = new ReservedSmsNotificationDeliveryProvider(getSafeNotificationProviderConfig(), true);
    await expect(provider.deliver(input)).resolves.toMatchObject({
      status: 'FAILED',
      provider: 'RESERVED_SMS',
      errorCode: 'PROVIDER_DISABLED',
    });
  });

  it('validates phone and body', async () => {
    const provider = new ReservedSmsNotificationDeliveryProvider(getSafeNotificationProviderConfig(), true);
    await expect(provider.deliver({ ...input, recipient: { phoneNumber: '123' } })).rejects.toThrow(/valid phone recipient/i);
    await expect(provider.deliver({ ...input, body: '   ' })).rejects.toThrow(/requires a body/i);
  });

  it('uses mock transport only when enabled', async () => {
    const transport = {
      send: vi.fn(async () => ({ ok: true, providerMessageId: 'msg-2', metadata: { safe: true } })),
    };
    const provider = new ReservedSmsNotificationDeliveryProvider(
      {
        defaultProvider: 'NOOP',
        smsProvider: 'TWILIO_RESERVED',
        featureFlags: { emailProviderEnabled: false, smsProviderEnabled: true, allowLiveDelivery: true },
      },
      true,
      transport,
    );

    await expect(provider.deliver(input)).resolves.toMatchObject({
      status: 'SUCCEEDED',
      provider: 'RESERVED_SMS',
      providerMessageId: 'msg-2',
    });
    expect(transport.send).toHaveBeenCalledOnce();
  });
});
