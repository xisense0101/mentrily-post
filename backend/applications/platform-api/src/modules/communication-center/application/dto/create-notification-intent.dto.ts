import type {
  NotificationChannelContract,
  NotificationPriorityContract,
  NotificationRecipientContract,
} from '@mentrily/contract-catalog';

export interface CreateNotificationIntentInput {
  templateId?: string | undefined;
  channel: NotificationChannelContract;
  recipient: NotificationRecipientContract;
  subject?: string | undefined;
  body?: string | undefined;
  variables?: Record<string, string | number | boolean | null> | undefined;
  priority?: NotificationPriorityContract | undefined;
  provider?: 'NOOP' | 'FIXTURE' | 'RESERVED_EMAIL' | 'RESERVED_SMS' | undefined;
  scheduledFor?: string | undefined;
  draft?: boolean | undefined;
  metadata?: Record<string, unknown> | undefined;
}
