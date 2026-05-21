import type { NotificationDeliveryProvider } from '../../application/ports/index.js';
import type { NotificationChannel, NotificationProvider } from '../../domain/value-objects/index.js';

export interface NotificationDeliveryProviderRegistry {
  getProvider(input: {
    channel: NotificationChannel;
    requestedProvider?: NotificationProvider | undefined;
  }): NotificationDeliveryProvider;
}

export const NOTIFICATION_DELIVERY_PROVIDER_REGISTRY = Symbol('NOTIFICATION_DELIVERY_PROVIDER_REGISTRY');
