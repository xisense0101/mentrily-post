import { AppError } from '@mentrily/service-core';

export type NotificationProvider =
  | 'NOOP'
  | 'FIXTURE'
  | 'RESERVED_EMAIL'
  | 'RESERVED_SMS';

const PROVIDERS: NotificationProvider[] = ['NOOP', 'FIXTURE', 'RESERVED_EMAIL', 'RESERVED_SMS'];

export function assertNotificationProvider(value: string): NotificationProvider {
  if (PROVIDERS.includes(value as NotificationProvider)) {
    return value as NotificationProvider;
  }

  throw new AppError('VALIDATION_ERROR', 'invalid notification provider', 400);
}
