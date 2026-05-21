import { Injectable } from '@nestjs/common';
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
import type { NotificationProviderTransport } from './reserved-email-notification-delivery.provider.js';
import { mapReservedSmsDeliveryRequest } from './reserved-sms-provider.mapper.js';

@Injectable()
export class ReservedSmsNotificationDeliveryProvider implements NotificationDeliveryProvider {
  constructor(
    private readonly providerConfig: NotificationProviderConfig,
    private readonly isTestEnvironment: boolean,
    private readonly transport?: NotificationProviderTransport,
  ) {}

  async deliver(input: NotificationDeliveryProviderRequest): Promise<NotificationDeliveryProviderResult> {
    mapReservedSmsDeliveryRequest(input);

    if (
      !isNotificationProviderEnabled({
        provider: 'RESERVED_SMS',
        channel: input.channel,
        config: this.providerConfig,
        isTestEnvironment: this.isTestEnvironment,
      }) ||
      (requiresLiveDelivery('RESERVED_SMS') && !this.providerConfig.featureFlags.allowLiveDelivery)
    ) {
      return {
        status: 'FAILED',
        provider: 'RESERVED_SMS',
        errorCode: 'PROVIDER_DISABLED',
        errorMessage: 'SMS provider delivery is disabled by configuration.',
        metadata: { safe: true },
      };
    }

    if (!this.transport) {
      return {
        status: 'FAILED',
        provider: 'RESERVED_SMS',
        errorCode: 'PROVIDER_TRANSPORT_UNAVAILABLE',
        errorMessage: 'SMS provider transport is unavailable.',
        metadata: { safe: true },
      };
    }

    const payload = mapReservedSmsDeliveryRequest(input);
    const result = await this.transport.send({
      provider: 'RESERVED_SMS',
      channel: 'SMS',
      payload: { ...payload },
    });

    return result.ok
      ? {
          status: 'SUCCEEDED',
          provider: 'RESERVED_SMS',
          providerMessageId: result.providerMessageId,
          metadata: result.metadata ?? { safe: true },
        }
      : {
          status: 'FAILED',
          provider: 'RESERVED_SMS',
          errorCode: result.errorCode ?? 'PROVIDER_TRANSPORT_FAILED',
          errorMessage: result.errorMessage ?? 'SMS provider transport failed.',
          metadata: result.metadata ?? { safe: true },
        };
  }
}
