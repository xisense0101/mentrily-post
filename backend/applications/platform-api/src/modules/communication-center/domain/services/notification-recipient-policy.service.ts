import { Injectable } from '@nestjs/common';
import { AppError } from '@mentrily/service-core';
import type { NotificationChannel, NotificationRecipient } from '../value-objects/index.js';

@Injectable()
export class NotificationRecipientPolicyService {
  validate(channel: NotificationChannel, recipient: NotificationRecipient): void {
    const hasAnyAddress = Boolean(recipient.principalId || recipient.email || recipient.phoneNumber);
    if (!hasAnyAddress) {
      throw new AppError('VALIDATION_ERROR', 'notification recipient is required', 400);
    }

    if (channel === 'EMAIL' && !recipient.email) {
      throw new AppError('VALIDATION_ERROR', 'email recipient is required for EMAIL channel', 400);
    }

    if (channel === 'SMS' && !recipient.phoneNumber) {
      throw new AppError('VALIDATION_ERROR', 'phoneNumber is required for SMS channel', 400);
    }

    if (channel === 'IN_APP' && !recipient.principalId) {
      throw new AppError('VALIDATION_ERROR', 'principalId is required for IN_APP channel', 400);
    }
  }
}
