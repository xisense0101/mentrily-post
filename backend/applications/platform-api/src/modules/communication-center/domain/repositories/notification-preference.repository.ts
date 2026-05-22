import type { TransactionContext } from '@mentrily/service-core';
import type { NotificationPreference } from '../entities/index.js';

export abstract class NotificationPreferenceRepository {
  abstract save(
    preference: NotificationPreference,
    transaction?: TransactionContext,
  ): Promise<NotificationPreference>;
  abstract listByUser(
    input: { workspaceId: string; userId: string },
    transaction?: TransactionContext,
  ): Promise<NotificationPreference[]>;
  abstract findUnique(
    input: { workspaceId: string; userId: string; channel: string; category: string },
    transaction?: TransactionContext,
  ): Promise<NotificationPreference | null>;
}
