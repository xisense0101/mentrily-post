import type {
  NotificationChannelContract,
  NotificationTemplateContract,
  NotificationTemplateStatusContract,
} from '@mentrily/contract-catalog';

export interface NotificationTemplateResponse extends NotificationTemplateContract {
  channel: NotificationChannelContract;
  status: NotificationTemplateStatusContract;
}
