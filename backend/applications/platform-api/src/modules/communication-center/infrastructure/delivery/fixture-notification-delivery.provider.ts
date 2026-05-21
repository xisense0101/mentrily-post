import { Injectable } from '@nestjs/common';
import type {
  NotificationDeliveryProvider,
  NotificationDeliveryProviderRequest,
  NotificationDeliveryProviderResult,
} from '../../application/ports/index.js';

@Injectable()
export class FixtureNotificationDeliveryProvider implements NotificationDeliveryProvider {
  async deliver(input: NotificationDeliveryProviderRequest): Promise<NotificationDeliveryProviderResult> {
    if (input.metadata.fixtureResult === 'FAILED') {
      return {
        status: 'FAILED',
        provider: 'FIXTURE',
        errorCode: 'FIXTURE_FAILURE',
        errorMessage: 'fixture provider simulated failure',
        metadata: { simulated: true },
      };
    }

    return {
      status: 'SUCCEEDED',
      provider: 'FIXTURE',
      providerMessageId: `fixture-${input.intentId}`,
      metadata: { simulated: true },
    };
  }
}
