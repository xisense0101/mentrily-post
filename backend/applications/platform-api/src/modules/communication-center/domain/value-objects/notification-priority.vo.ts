import { AppError } from '@mentrily/service-core';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

const PRIORITIES: NotificationPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export function assertNotificationPriority(value: string): NotificationPriority {
  if (PRIORITIES.includes(value as NotificationPriority)) {
    return value as NotificationPriority;
  }

  throw new AppError('VALIDATION_ERROR', 'invalid notification priority', 400);
}
