import type {
  NotificationChannelContract,
  NotificationIntentContract,
  NotificationIntentStatusContract,
  NotificationPriorityContract,
  NotificationProviderContract,
} from '@mentrily/contract-catalog';

export interface NotificationIntentResponse extends NotificationIntentContract {
  channel: NotificationChannelContract;
  priority: NotificationPriorityContract;
  status: NotificationIntentStatusContract;
  provider: NotificationProviderContract;
}

export interface MarkNotificationIntentFailedInput {
  failureReason: string;
  provider?: NotificationProviderContract | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface MarkNotificationIntentDispatchedInput {
  provider?: NotificationProviderContract | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface RenderNotificationTemplateResponse {
  subject?: string | undefined;
  body: string;
}
