import { Injectable } from '@nestjs/common';
import type {
  NotificationDeliveryProvider,
  NotificationDeliveryProviderRequest,
  NotificationDeliveryProviderResult,
} from '../../application/ports/index.js';

@Injectable()
export class NoopNotificationDeliveryProvider implements NotificationDeliveryProvider {
  async deliver(_input: NotificationDeliveryProviderRequest): Promise<NotificationDeliveryProviderResult> {
    return {
      status: 'FAILED',
      provider: 'NOOP',
      errorCode: 'NOOP_PROVIDER',
      errorMessage: 'notification delivery is disabled by default',
      metadata: {},
    };
  }
}
