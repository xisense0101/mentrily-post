import { AppError } from '@mentrily/service-core';
import type { NotificationDeliveryProviderRequest } from '../../application/ports/index.js';

export interface ReservedSmsPayload {
  to: string;
  body: string;
  metadata?: Record<string, unknown> | undefined;
}

function isValidPhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/u.test(value);
}

function redactPhoneNumber(value: string): string {
  const suffix = value.slice(-2);
  return `***${suffix}`;
}

export function mapReservedSmsDeliveryRequest(input: NotificationDeliveryProviderRequest): ReservedSmsPayload {
  const phoneNumber = input.recipient.phoneNumber?.trim();
  if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
    throw new AppError('VALIDATION_ERROR', 'reserved sms delivery requires a valid phone recipient', 400);
  }

  if (!input.body.trim()) {
    throw new AppError(
      'VALIDATION_ERROR',
      `reserved sms delivery requires a body for recipient ${redactPhoneNumber(phoneNumber)}`,
      400,
    );
  }

  return {
    to: phoneNumber,
    body: input.body,
    ...(Object.keys(input.metadata).length > 0 ? { metadata: { ...input.metadata } } : {}),
  };
}
