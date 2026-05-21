import { AppError } from '@mentrily/service-core';
import type { NotificationDeliveryProviderRequest } from '../../application/ports/index.js';

export interface ReservedEmailPayload {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function redactEmail(value: string): string {
  const [localPart = '', domain = ''] = value.split('@');
  const localVisible = localPart.slice(0, 1);
  const domainVisible = domain.slice(0, 3);
  return `${localVisible || '*'}***@${domainVisible || '***'}***`;
}

export function mapReservedEmailDeliveryRequest(input: NotificationDeliveryProviderRequest): ReservedEmailPayload {
  const email = input.recipient.email?.trim();
  if (!email || !isValidEmail(email)) {
    throw new AppError('VALIDATION_ERROR', 'reserved email delivery requires a valid email recipient', 400);
  }

  const subject = input.subject?.trim();
  if (!subject) {
    throw new AppError(
      'VALIDATION_ERROR',
      `reserved email delivery requires a subject for recipient ${redactEmail(email)}`,
      400,
    );
  }

  if (!input.body.trim()) {
    throw new AppError(
      'VALIDATION_ERROR',
      `reserved email delivery requires a body for recipient ${redactEmail(email)}`,
      400,
    );
  }

  return {
    to: email,
    subject,
    bodyText: input.body,
    ...(typeof input.metadata.bodyHtml === 'string' && input.metadata.bodyHtml.trim()
      ? { bodyHtml: input.metadata.bodyHtml }
      : {}),
    ...(Object.keys(input.metadata).length > 0 ? { metadata: { ...input.metadata } } : {}),
  };
}
