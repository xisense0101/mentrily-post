import { describe, expect, it } from 'vitest';
import {
  getSafeNotificationProviderConfig,
  loadNotificationProviderConfig,
} from '../application/support/index.js';

describe('notification provider config', () => {
  it('defaults to a safe noop configuration', () => {
    expect(getSafeNotificationProviderConfig()).toEqual({
      defaultProvider: 'NOOP',
      featureFlags: {
        emailProviderEnabled: false,
        smsProviderEnabled: false,
        allowLiveDelivery: false,
      },
    });
  });

  it('disables live delivery by default when env vars are absent', () => {
    expect(loadNotificationProviderConfig({})).toMatchObject({
      defaultProvider: 'NOOP',
      featureFlags: {
        allowLiveDelivery: false,
      },
    });
  });

  it('rejects invalid provider config safely', () => {
    expect(() =>
      loadNotificationProviderConfig({
        COMMUNICATION_PROVIDER_MODE: 'FIXTURE',
        NODE_ENV: 'production',
      }),
    ).toThrowError(/fixture communication provider is only allowed in test environments/i);
  });

  it('allows fixture provider in test config', () => {
    expect(
      loadNotificationProviderConfig({
        NODE_ENV: 'test',
        COMMUNICATION_PROVIDER_MODE: 'FIXTURE',
      }),
    ).toMatchObject({
      defaultProvider: 'FIXTURE',
    });
  });
});
