import { AppError } from '@mentrily/service-core';
import type { NotificationDeliveryProvider } from '../../application/ports/index.js';
import {
  isNotificationProviderEnabled,
  requiresLiveDelivery,
  type CommunicationProviderMode,
  type NotificationProviderConfig,
} from '../../application/support/index.js';
import type {
  NotificationChannel,
  NotificationProvider,
} from '../../domain/value-objects/index.js';
import { FixtureNotificationDeliveryProvider } from './fixture-notification-delivery.provider.js';
import { NoopNotificationDeliveryProvider } from './noop-notification-delivery.provider.js';
import type { NotificationDeliveryProviderRegistry } from './notification-delivery-provider.registry.js';
import { ReservedEmailNotificationDeliveryProvider } from './reserved-email-notification-delivery.provider.js';
import { ReservedSmsNotificationDeliveryProvider } from './reserved-sms-notification-delivery.provider.js';
import { ReservedPushNotificationDeliveryProvider } from './reserved-push-notification-delivery.provider.js';

export class NotificationDeliveryProviderFactory implements NotificationDeliveryProviderRegistry {
  constructor(
    private readonly providerConfig: NotificationProviderConfig,
    private readonly isTestEnvironment: boolean,
    private readonly noopProvider: NoopNotificationDeliveryProvider,
    private readonly fixtureProvider: FixtureNotificationDeliveryProvider,
    private readonly reservedEmailProvider: ReservedEmailNotificationDeliveryProvider,
    private readonly reservedSmsProvider: ReservedSmsNotificationDeliveryProvider,
    private readonly reservedPushProvider: ReservedPushNotificationDeliveryProvider,
  ) {}

  getProvider(input: {
    channel: NotificationChannel;
    requestedProvider?: NotificationProvider | undefined;
  }): NotificationDeliveryProvider {
    const resolvedProvider = input.requestedProvider ?? this.providerConfig.defaultProvider;
    const isExplicitRequest = input.requestedProvider !== undefined;

    if (resolvedProvider === 'FIXTURE' && !this.isTestEnvironment) {
      throw new AppError(
        'VALIDATION_ERROR',
        'fixture notification provider is only available in test environments',
        500,
      );
    }

    if (resolvedProvider === 'RESERVED_PUSH') {
      throw new AppError(
        'VALIDATION_ERROR',
        'RESERVED_PUSH provider is deferred and cannot be mapped to any channel because PUSH channel does not exist',
        500,
      );
    }

    if (
      (resolvedProvider === 'RESERVED_EMAIL' && input.channel !== 'EMAIL') ||
      (resolvedProvider === 'RESERVED_SMS' && input.channel !== 'SMS')
    ) {
      throw new AppError(
        'VALIDATION_ERROR',
        'notification provider channel configuration is invalid',
        500,
      );
    }

    const providerUnavailable =
      !isNotificationProviderEnabled({
        provider: resolvedProvider,
        channel: input.channel,
        config: this.providerConfig,
        isTestEnvironment: this.isTestEnvironment,
      }) ||
      (requiresLiveDelivery(resolvedProvider) &&
        !this.providerConfig.featureFlags.allowLiveDelivery);

    if (providerUnavailable && !isExplicitRequest && resolvedProvider !== 'NOOP') {
      return this.noopProvider;
    }

    switch (resolvedProvider as NotificationProvider | CommunicationProviderMode) {
      case 'NOOP':
        return this.noopProvider;
      case 'FIXTURE':
        return this.fixtureProvider;
      case 'RESERVED_EMAIL':
        return this.reservedEmailProvider;
      case 'RESERVED_SMS':
        return this.reservedSmsProvider;
      case 'RESERVED_PUSH':
        return this.reservedPushProvider;
      default:
        throw new AppError(
          'VALIDATION_ERROR',
          'notification provider configuration is invalid',
          500,
        );
    }
  }
}
