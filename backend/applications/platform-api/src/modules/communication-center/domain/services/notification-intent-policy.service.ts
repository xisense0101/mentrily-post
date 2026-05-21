import { Injectable } from '@nestjs/common';
import { AppError } from '@mentrily/service-core';
import type { NotificationIntent } from '../entities/index.js';
import type { NotificationChannel } from '../value-objects/index.js';

@Injectable()
export class NotificationIntentPolicyService {
  validateCreate(input: {
    channel: NotificationChannel;
    subject?: string | undefined;
    body: string;
    scheduledFor?: Date | undefined;
  }): void {
    if (!input.body.trim()) {
      throw new AppError('VALIDATION_ERROR', 'body is required', 400);
    }
    if (input.channel === 'EMAIL' && !input.subject?.trim()) {
      throw new AppError('VALIDATION_ERROR', 'subject is required for EMAIL notifications', 400);
    }
    if (input.channel === 'SMS' && input.body.length > 1600) {
      throw new AppError('VALIDATION_ERROR', 'SMS body exceeds conservative length limit', 400);
    }
    if (input.channel === 'EMAIL' && input.body.length > 200000) {
      throw new AppError('VALIDATION_ERROR', 'EMAIL body exceeds supported limit', 400);
    }
    if (input.scheduledFor && input.scheduledFor.getTime() < Date.now()) {
      throw new AppError('VALIDATION_ERROR', 'scheduledFor cannot be in the past', 400);
    }
  }

  assertMutable(intent: NotificationIntent): void {
    if (intent.isTerminal()) {
      throw new AppError('CONFLICT', 'terminal notification intent cannot be mutated', 409);
    }
  }
}
