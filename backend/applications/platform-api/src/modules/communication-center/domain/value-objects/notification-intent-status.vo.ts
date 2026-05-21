import { AppError } from '@mentrily/service-core';

export type NotificationIntentStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'DISPATCHED'
  | 'FAILED'
  | 'CANCELLED';

const STATUSES: NotificationIntentStatus[] = ['DRAFT', 'QUEUED', 'DISPATCHED', 'FAILED', 'CANCELLED'];

export function assertNotificationIntentStatus(value: string): NotificationIntentStatus {
  if (STATUSES.includes(value as NotificationIntentStatus)) {
    return value as NotificationIntentStatus;
  }

  throw new AppError('VALIDATION_ERROR', 'invalid notification intent status', 400);
}
