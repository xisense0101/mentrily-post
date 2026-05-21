import type {
  NotificationChannel,
  NotificationProvider,
  NotificationRecipient,
} from '../../domain/value-objects/index.js';

export interface NotificationDeliveryProviderRequest {
  intentId: string;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  subject?: string | undefined;
  body: string;
  metadata: Record<string, unknown>;
}

export interface NotificationDeliveryProviderResult {
  status: 'SUCCEEDED' | 'FAILED';
  provider: NotificationProvider;
  providerMessageId?: string | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface NotificationDeliveryProvider {
  deliver(input: NotificationDeliveryProviderRequest): Promise<NotificationDeliveryProviderResult>;
}

export const NOTIFICATION_DELIVERY_PROVIDER = Symbol('NOTIFICATION_DELIVERY_PROVIDER');
