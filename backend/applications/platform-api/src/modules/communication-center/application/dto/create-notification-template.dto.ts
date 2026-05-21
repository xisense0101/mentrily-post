import type {
  NotificationChannelContract,
} from '@mentrily/contract-catalog';

export interface CreateNotificationTemplateInput {
  key: string;
  name: string;
  description?: string | undefined;
  channel: NotificationChannelContract;
  subjectTemplate?: string | undefined;
  bodyTemplate: string;
  variables?: string[] | undefined;
  activate?: boolean | undefined;
  metadata?: Record<string, unknown> | undefined;
}
