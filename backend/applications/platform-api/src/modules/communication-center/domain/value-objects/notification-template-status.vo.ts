import { AppError } from '@mentrily/service-core';

export type NotificationTemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

const STATUSES: NotificationTemplateStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

export function assertNotificationTemplateStatus(value: string): NotificationTemplateStatus {
  if (STATUSES.includes(value as NotificationTemplateStatus)) {
    return value as NotificationTemplateStatus;
  }

  throw new AppError('VALIDATION_ERROR', 'invalid notification template status', 400);
}
