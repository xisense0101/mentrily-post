import { Injectable } from '@nestjs/common';
import type { NotificationDeliveryAttempt, NotificationIntent } from '../entities/index.js';

export type NotificationSchedulerSkipReason =
  | 'NOT_QUEUED'
  | 'NOT_DUE'
  | 'TERMINAL'
  | 'INVALID_RECIPIENT'
  | 'MAX_ATTEMPTS_REACHED';

export interface NotificationSchedulerEligibility {
  eligible: boolean;
  reason?: NotificationSchedulerSkipReason | undefined;
}

@Injectable()
export class NotificationSchedulerPolicyService {
  readonly maxAttempts = 3;

  evaluate(input: {
    intent: NotificationIntent;
    attempts: NotificationDeliveryAttempt[];
    now: Date;
    recipientValid: boolean;
  }): NotificationSchedulerEligibility {
    const { intent, attempts, now, recipientValid } = input;

    if (intent.isTerminal()) {
      return { eligible: false, reason: 'TERMINAL' };
    }

    if (intent.status !== 'QUEUED') {
      return { eligible: false, reason: 'NOT_QUEUED' };
    }

    if (intent.scheduledFor && intent.scheduledFor.getTime() > now.getTime()) {
      return { eligible: false, reason: 'NOT_DUE' };
    }

    if (!recipientValid) {
      return { eligible: false, reason: 'INVALID_RECIPIENT' };
    }

    if (attempts.length >= this.maxAttempts) {
      return { eligible: false, reason: 'MAX_ATTEMPTS_REACHED' };
    }

    return { eligible: true };
  }
}
