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
import { mapReservedEmailDeliveryRequest } from './reserved-email-provider.mapper.js';

export interface NotificationProviderTransportResult {
  ok: boolean;
  providerMessageId?: string | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface NotificationProviderTransport {
  send(input: {
    provider: 'RESERVED_EMAIL' | 'RESERVED_SMS';
    channel: 'EMAIL' | 'SMS';
    payload: Record<string, unknown>;
  }): Promise<NotificationProviderTransportResult>;
}

@Injectable()
export class ReservedEmailNotificationDeliveryProvider implements NotificationDeliveryProvider {
  constructor(
    private readonly providerConfig: NotificationProviderConfig,
    private readonly isTestEnvironment: boolean,
    private readonly transport?: NotificationProviderTransport,
  ) {}

  async deliver(
    input: NotificationDeliveryProviderRequest,
  ): Promise<NotificationDeliveryProviderResult> {
    mapReservedEmailDeliveryRequest(input);

    if (
      !isNotificationProviderEnabled({
        provider: 'RESERVED_EMAIL',
        channel: input.channel,
        config: this.providerConfig,
        isTestEnvironment: this.isTestEnvironment,
      }) ||
      (requiresLiveDelivery('RESERVED_EMAIL') &&
        !this.providerConfig.featureFlags.allowLiveDelivery)
    ) {
      return {
        status: 'FAILED',
        provider: 'RESERVED_EMAIL',
        errorCode: 'PROVIDER_DISABLED',
        errorMessage: 'Email provider delivery is disabled by configuration.',
        metadata: { safe: true },
      };
    }

    if (!this.transport) {
      return {
        status: 'FAILED',
        provider: 'RESERVED_EMAIL',
        errorCode: 'PROVIDER_TRANSPORT_UNAVAILABLE',
        errorMessage: 'Email provider transport is unavailable.',
        metadata: { safe: true },
      };
    }

    const payload = mapReservedEmailDeliveryRequest(input);
    const result = await this.transport.send({
      provider: 'RESERVED_EMAIL',
      channel: 'EMAIL',
      payload: { ...payload },
    });

    return result.ok
      ? {
          status: 'SUCCEEDED',
          provider: 'RESERVED_EMAIL',
          providerMessageId: result.providerMessageId,
          metadata: result.metadata ?? { safe: true },
        }
      : {
          status: 'FAILED',
          provider: 'RESERVED_EMAIL',
          errorCode: result.errorCode ?? 'PROVIDER_TRANSPORT_FAILED',
          errorMessage: result.errorMessage ?? 'Email provider transport failed.',
          metadata: result.metadata ?? { safe: true },
          retryable: result.metadata?.retryable === true,
        };
  }
}
