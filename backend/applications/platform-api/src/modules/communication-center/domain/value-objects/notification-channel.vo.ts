import { AppError } from '@mentrily/service-core';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'IN_APP';

const CHANNELS: NotificationChannel[] = ['EMAIL', 'SMS', 'IN_APP'];

export function assertNotificationChannel(value: string): NotificationChannel {
  if (CHANNELS.includes(value as NotificationChannel)) {
    return value as NotificationChannel;
  }

  throw new AppError('VALIDATION_ERROR', 'invalid notification channel', 400);
}
