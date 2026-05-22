import type { TransactionContext } from '@mentrily/service-core';
import type { NotificationChannel, NotificationIntentStatus } from '../value-objects/index.js';
import type { NotificationIntent } from '../entities/index.js';

export abstract class NotificationIntentRepository {
  abstract save(
    intent: NotificationIntent,
    transaction?: TransactionContext,
  ): Promise<NotificationIntent>;
  abstract findById(
    id: string,
    transaction?: TransactionContext,
  ): Promise<NotificationIntent | null>;
  abstract listByWorkspace(
    input: {
      workspaceId: string;
      channel?: NotificationChannel | undefined;
      status?: NotificationIntentStatus | undefined;
    },
    transaction?: TransactionContext,
  ): Promise<NotificationIntent[]>;
  abstract findDueQueued(
    input: {
      workspaceId?: string | undefined;
      limit: number;
      now: Date;
    },
    transaction?: TransactionContext,
  ): Promise<NotificationIntent[]>;
  abstract markDispatchedIfQueued(
    input: {
      intentId: string;
      provider: NotificationIntent['provider'];
      metadata?: Record<string, unknown> | undefined;
      occurredAt: Date;
    },
    transaction?: TransactionContext,
  ): Promise<NotificationIntent | null>;
  abstract markFailedIfQueued(
    input: {
      intentId: string;
      failureReason: string;
      provider: NotificationIntent['provider'];
      metadata?: Record<string, unknown> | undefined;
      occurredAt: Date;
    },
    transaction?: TransactionContext,
  ): Promise<NotificationIntent | null>;

  abstract listByRecipient(
    input: {
      workspaceId: string;
      recipientId: string;
      status?: 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED';
      limit?: number;
    },
    transaction?: TransactionContext,
  ): Promise<NotificationIntent[]>;

  abstract countUnreadByRecipient(
    input: {
      workspaceId: string;
      recipientId: string;
    },
    transaction?: TransactionContext,
  ): Promise<number>;
}
