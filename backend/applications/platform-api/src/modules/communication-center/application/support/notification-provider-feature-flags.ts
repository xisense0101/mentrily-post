import type { NotificationChannel, NotificationProvider } from '../../domain/value-objects/index.js';
import type { CommunicationProviderMode, NotificationProviderConfig } from './notification-provider-config.js';

export function isNotificationProviderFixtureAllowed(isTestEnvironment: boolean): boolean {
  return isTestEnvironment;
}

export function isNotificationProviderEnabled(
  input: {
    provider: NotificationProvider | CommunicationProviderMode;
    channel: NotificationChannel;
    config: NotificationProviderConfig;
    isTestEnvironment: boolean;
  },
): boolean {
  switch (input.provider) {
    case 'NOOP':
      return true;
    case 'FIXTURE':
      return isNotificationProviderFixtureAllowed(input.isTestEnvironment);
    case 'RESERVED_EMAIL':
      return input.channel === 'EMAIL' && input.config.featureFlags.emailProviderEnabled;
    case 'RESERVED_SMS':
      return input.channel === 'SMS' && input.config.featureFlags.smsProviderEnabled;
    default:
      return false;
  }
}

export function requiresLiveDelivery(provider: NotificationProvider | CommunicationProviderMode): boolean {
  return provider === 'RESERVED_EMAIL' || provider === 'RESERVED_SMS';
}
