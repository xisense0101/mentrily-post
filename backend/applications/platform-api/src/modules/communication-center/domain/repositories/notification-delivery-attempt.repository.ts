import type { TransactionContext } from '@mentrily/service-core';
import type { NotificationDeliveryAttempt } from '../entities/index.js';

export abstract class NotificationDeliveryAttemptRepository {
  abstract save(
    attempt: NotificationDeliveryAttempt,
    transaction?: TransactionContext,
  ): Promise<NotificationDeliveryAttempt>;

  abstract findById(
    id: string,
    transaction?: TransactionContext,
  ): Promise<NotificationDeliveryAttempt | null>;

  abstract findByIntentId(
    intentId: string,
    transaction?: TransactionContext,
  ): Promise<NotificationDeliveryAttempt[]>;

  abstract countByIntentId(
    intentId: string,
    transaction?: TransactionContext,
  ): Promise<number>;
}
