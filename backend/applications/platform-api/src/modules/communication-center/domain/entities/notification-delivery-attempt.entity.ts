import { AppError } from '@mentrily/service-core';
import type { NotificationProvider } from '../value-objects/index.js';
import { assertNotificationProvider } from '../value-objects/index.js';

export type NotificationDeliveryAttemptStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export interface NotificationDeliveryAttemptProps {
  id: string;
  intentId: string;
  provider: NotificationProvider;
  status: NotificationDeliveryAttemptStatus;
  attemptNumber: number;
  providerMessageId?: string | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  createdAt: Date;
  completedAt?: Date | undefined;
  metadata: Record<string, unknown>;
}

function required(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError('VALIDATION_ERROR', `${field} is required`, 400);
  }
  return trimmed;
}

export class NotificationDeliveryAttempt {
  readonly id: string;
  readonly intentId: string;
  readonly provider: NotificationProvider;
  readonly status: NotificationDeliveryAttemptStatus;
  readonly attemptNumber: number;
  readonly providerMessageId?: string | undefined;
  readonly errorCode?: string | undefined;
  readonly errorMessage?: string | undefined;
  readonly createdAt: Date;
  readonly completedAt?: Date | undefined;
  readonly metadata: Record<string, unknown>;

  constructor(props: NotificationDeliveryAttemptProps) {
    this.id = required(props.id, 'id');
    this.intentId = required(props.intentId, 'intentId');
    this.provider = assertNotificationProvider(props.provider);
    this.status = props.status;
    this.attemptNumber = props.attemptNumber;
    this.providerMessageId = props.providerMessageId?.trim() || undefined;
    this.errorCode = props.errorCode?.trim() || undefined;
    this.errorMessage = props.errorMessage?.trim() || undefined;
    this.createdAt = props.createdAt;
    this.completedAt = props.completedAt;
    this.metadata = { ...props.metadata };
  }

  static createPending(
    input: Omit<NotificationDeliveryAttemptProps, 'status' | 'createdAt' | 'metadata'> & {
      createdAt?: Date | undefined;
      metadata?: Record<string, unknown> | undefined;
    },
  ): NotificationDeliveryAttempt {
    return new NotificationDeliveryAttempt({
      ...input,
      status: 'PENDING',
      createdAt: input.createdAt ?? new Date(),
      metadata: input.metadata ?? {},
    });
  }

  markSucceeded(input: {
    providerMessageId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    occurredAt?: Date | undefined;
  }): NotificationDeliveryAttempt {
    if (this.status !== 'PENDING') {
      throw new AppError('CONFLICT', 'delivery attempt already completed', 409);
    }
    return new NotificationDeliveryAttempt({
      ...this,
      status: 'SUCCEEDED',
      providerMessageId: input.providerMessageId,
      completedAt: input.occurredAt ?? new Date(),
      metadata: input.metadata ? { ...this.metadata, ...input.metadata } : this.metadata,
    });
  }

  markFailed(input: {
    errorCode?: string | undefined;
    errorMessage?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    occurredAt?: Date | undefined;
  }): NotificationDeliveryAttempt {
    if (this.status !== 'PENDING') {
      throw new AppError('CONFLICT', 'delivery attempt already completed', 409);
    }
    return new NotificationDeliveryAttempt({
      ...this,
      status: 'FAILED',
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      completedAt: input.occurredAt ?? new Date(),
      metadata: input.metadata ? { ...this.metadata, ...input.metadata } : this.metadata,
    });
  }
}
