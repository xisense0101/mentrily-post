import { describe, expect, it } from 'vitest';
import { getSafeNotificationProviderConfig } from '../application/support/index.js';
import {
  FixtureNotificationDeliveryProvider,
  NotificationDeliveryProviderFactory,
  NoopNotificationDeliveryProvider,
  ReservedEmailNotificationDeliveryProvider,
  ReservedSmsNotificationDeliveryProvider,
  ReservedPushNotificationDeliveryProvider,
} from '../infrastructure/index.js';

describe('notification delivery provider registry', () => {
  function createFactory(
    overrides: Partial<ReturnType<typeof getSafeNotificationProviderConfig>> = {},
    isTestEnvironment = false,
  ) {
    const config = { ...getSafeNotificationProviderConfig(), ...overrides };
    return new NotificationDeliveryProviderFactory(
      config,
      isTestEnvironment,
      new NoopNotificationDeliveryProvider(),
      new FixtureNotificationDeliveryProvider(),
      new ReservedEmailNotificationDeliveryProvider(config, isTestEnvironment),
      new ReservedSmsNotificationDeliveryProvider(config, isTestEnvironment),
      new ReservedPushNotificationDeliveryProvider(config, isTestEnvironment),
    );
  }

  it('resolves noop by default', () => {
    const provider = createFactory().getProvider({ channel: 'EMAIL' });
    expect(provider).toBeInstanceOf(NoopNotificationDeliveryProvider);
  });

  it('resolves fixture in tests', () => {
    const provider = createFactory({ defaultProvider: 'FIXTURE' }, true).getProvider({
      channel: 'SMS',
    });
    expect(provider).toBeInstanceOf(FixtureNotificationDeliveryProvider);
  });

  it('refuses fixture outside tests', () => {
    expect(() =>
      createFactory({ defaultProvider: 'FIXTURE' }).getProvider({ channel: 'EMAIL' }),
    ).toThrowError(/fixture notification provider is only available in test environments/i);
  });

  it('returns noop when a disabled reserved provider is only configured as default', () => {
    const provider = createFactory({ defaultProvider: 'RESERVED_EMAIL' }).getProvider({
      channel: 'EMAIL',
    });
    expect(provider).toBeInstanceOf(NoopNotificationDeliveryProvider);
  });

  it('resolves reserved provider only when explicitly requested in test config', () => {
    const provider = createFactory(
      {
        emailProvider: 'RESEND_RESERVED',
        featureFlags: {
          emailProviderEnabled: true,
          smsProviderEnabled: false,
          allowLiveDelivery: true,
        },
      },
      true,
    ).getProvider({ channel: 'EMAIL', requestedProvider: 'RESERVED_EMAIL' });

    expect(provider).toBeInstanceOf(ReservedEmailNotificationDeliveryProvider);
  });
});
