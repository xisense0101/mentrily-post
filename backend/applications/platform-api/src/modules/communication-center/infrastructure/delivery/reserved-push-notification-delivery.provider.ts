import { Injectable } from '@nestjs/common';
import { AppError } from '@mentrily/service-core';
import type {
  NotificationDeliveryProvider,
  NotificationDeliveryProviderRequest,
  NotificationDeliveryProviderResult,
} from '../../application/ports/index.js';
import {
  isNotificationProviderEnabled,
  requiresLiveDelivery,
  type NotificationProviderConfig,
} from '../../application/support/index.js';

@Injectable()
export class ReservedPushNotificationDeliveryProvider implements NotificationDeliveryProvider {
  constructor(
    private readonly providerConfig: NotificationProviderConfig,
    private readonly isTestEnvironment: boolean,
  ) {}

  async deliver(
    input: NotificationDeliveryProviderRequest,
  ): Promise<NotificationDeliveryProviderResult> {
    if (!input.recipient.principalId) {
      throw new AppError(
        'VALIDATION_ERROR',
        'reserved push delivery requires a valid principalId recipient',
        400,
      );
    }

    if (
      !isNotificationProviderEnabled({
        provider: 'RESERVED_PUSH',
        channel: input.channel,
        config: this.providerConfig,
        isTestEnvironment: this.isTestEnvironment,
      }) ||
      (requiresLiveDelivery('RESERVED_PUSH') && !this.providerConfig.featureFlags.allowLiveDelivery)
    ) {
      return {
        status: 'FAILED',
        provider: 'RESERVED_PUSH',
        errorCode: 'PROVIDER_DISABLED',
        errorMessage: 'Push provider delivery is disabled by configuration.',
        metadata: { safe: true },
      };
    }

    return {
      status: 'SUCCEEDED',
      provider: 'RESERVED_PUSH',
      providerMessageId: `push-deferred-${input.intentId}`,
      metadata: {
        deferred: true,
        safe: true,
        pushConfig: this.providerConfig.pushProviderReservedConfig || 'default-push-config',
      },
    };
  }
}
