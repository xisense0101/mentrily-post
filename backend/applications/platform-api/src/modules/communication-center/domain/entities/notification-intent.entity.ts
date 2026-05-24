import { AppError } from '@mentrily/service-core';
import type {
  NotificationChannel,
  NotificationIntentStatus,
  NotificationPriority,
  NotificationProvider,
  NotificationRecipient,
} from '../value-objects/index.js';
import {
  assertNotificationChannel,
  assertNotificationIntentStatus,
  assertNotificationPriority,
  assertNotificationProvider,
} from '../value-objects/index.js';

export interface NotificationIntentProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  templateId?: string | undefined;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  subject?: string | undefined;
  body: string;
  priority: NotificationPriority;
  status: NotificationIntentStatus;
  provider: NotificationProvider;
  scheduledFor?: Date | undefined;
  queuedAt?: Date | undefined;
  dispatchedAt?: Date | undefined;
  failedAt?: Date | undefined;
  cancelledAt?: Date | undefined;
  failureReason?: string | undefined;
  lockedAt?: Date | undefined;
  lockedBy?: string | undefined;
  metadata: Record<string, unknown>;
  createdByPrincipalId: string;
  createdAt: Date;
  updatedAt: Date;
}

function required(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError('VALIDATION_ERROR', `${field} is required`, 400);
  }
  return trimmed;
}

function recipient(input: NotificationRecipient): NotificationRecipient {
  return {
    ...(input.principalId ? { principalId: input.principalId } : {}),
    ...(input.email ? { email: input.email.trim() } : {}),
    ...(input.phoneNumber ? { phoneNumber: input.phoneNumber.trim() } : {}),
    ...(input.displayName ? { displayName: input.displayName.trim() } : {}),
  };
}

export class NotificationIntent {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly templateId?: string | undefined;
  readonly channel: NotificationChannel;
  readonly recipient: NotificationRecipient;
  readonly subject?: string | undefined;
  readonly body: string;
  readonly priority: NotificationPriority;
  readonly status: NotificationIntentStatus;
  readonly provider: NotificationProvider;
  readonly scheduledFor?: Date | undefined;
  readonly queuedAt?: Date | undefined;
  readonly dispatchedAt?: Date | undefined;
  readonly failedAt?: Date | undefined;
  readonly cancelledAt?: Date | undefined;
  readonly failureReason?: string | undefined;
  readonly lockedAt?: Date | undefined;
  readonly lockedBy?: string | undefined;
  readonly metadata: Record<string, unknown>;
  readonly createdByPrincipalId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: NotificationIntentProps) {
    this.id = required(props.id, 'id');
    this.tenantId = required(props.tenantId, 'tenantId');
    this.workspaceId = required(props.workspaceId, 'workspaceId');
    this.templateId = props.templateId?.trim() || undefined;
    this.channel = assertNotificationChannel(props.channel);
    this.recipient = recipient(props.recipient);
    this.subject = props.subject?.trim() || undefined;
    this.body = required(props.body, 'body');
    this.priority = assertNotificationPriority(props.priority);
    this.status = assertNotificationIntentStatus(props.status);
    this.provider = assertNotificationProvider(props.provider);
    this.scheduledFor = props.scheduledFor;
    this.queuedAt = props.queuedAt;
    this.dispatchedAt = props.dispatchedAt;
    this.failedAt = props.failedAt;
    this.cancelledAt = props.cancelledAt;
    this.failureReason = props.failureReason?.trim() || undefined;
    this.lockedAt = props.lockedAt;
    this.lockedBy = props.lockedBy;
    this.metadata = { ...props.metadata };
    this.createdByPrincipalId = required(props.createdByPrincipalId, 'createdByPrincipalId');
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static createQueued(
    input: Omit<
      NotificationIntentProps,
      'status' | 'priority' | 'createdAt' | 'updatedAt' | 'queuedAt' | 'metadata'
    > & {
      priority?: NotificationPriority | undefined;
      metadata?: Record<string, unknown> | undefined;
      createdAt?: Date | undefined;
      updatedAt?: Date | undefined;
      queuedAt?: Date | undefined;
    },
  ): NotificationIntent {
    const now = input.createdAt ?? new Date();
    return new NotificationIntent({
      ...input,
      priority: input.priority ?? 'NORMAL',
      status: 'QUEUED',
      metadata: input.metadata ?? {},
      queuedAt: input.queuedAt ?? now,
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static createDraft(
    input: Omit<
      NotificationIntentProps,
      'status' | 'priority' | 'createdAt' | 'updatedAt' | 'metadata'
    > & {
      priority?: NotificationPriority | undefined;
      metadata?: Record<string, unknown> | undefined;
      createdAt?: Date | undefined;
      updatedAt?: Date | undefined;
    },
  ): NotificationIntent {
    const now = input.createdAt ?? new Date();
    return new NotificationIntent({
      ...input,
      priority: input.priority ?? 'NORMAL',
      status: 'DRAFT',
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  markDispatched(input: {
    provider?: NotificationProvider | undefined;
    metadata?: Record<string, unknown> | undefined;
    occurredAt?: Date | undefined;
  }): NotificationIntent {
    if (this.status !== 'QUEUED') {
      throw new AppError('CONFLICT', 'notification intent cannot be marked dispatched', 409);
    }
    const occurredAt = input.occurredAt ?? new Date();
    return new NotificationIntent({
      ...this,
      status: 'DISPATCHED',
      provider: input.provider ?? this.provider,
      dispatchedAt: occurredAt,
      metadata: input.metadata ? { ...this.metadata, ...input.metadata } : this.metadata,
      updatedAt: occurredAt,
    });
  }

  markFailed(input: {
    failureReason: string;
    provider?: NotificationProvider | undefined;
    metadata?: Record<string, unknown> | undefined;
    occurredAt?: Date | undefined;
  }): NotificationIntent {
    if (this.status !== 'QUEUED') {
      throw new AppError('CONFLICT', 'notification intent cannot be marked failed', 409);
    }
    const occurredAt = input.occurredAt ?? new Date();
    return new NotificationIntent({
      ...this,
      status: 'FAILED',
      provider: input.provider ?? this.provider,
      failureReason: input.failureReason,
      failedAt: occurredAt,
      metadata: input.metadata ? { ...this.metadata, ...input.metadata } : this.metadata,
      updatedAt: occurredAt,
    });
  }

  cancel(occurredAt = new Date()): NotificationIntent {
    if (this.status !== 'QUEUED' && this.status !== 'DRAFT') {
      throw new AppError('CONFLICT', 'notification intent cannot be cancelled', 409);
    }
    return new NotificationIntent({
      ...this,
      status: 'CANCELLED',
      cancelledAt: occurredAt,
      updatedAt: occurredAt,
    });
  }

  lock(lockedBy: string, lockedAt = new Date()): NotificationIntent {
    return new NotificationIntent({
      ...this,
      lockedAt,
      lockedBy,
      updatedAt: lockedAt,
    });
  }

  unlock(occurredAt = new Date()): NotificationIntent {
    return new NotificationIntent({
      ...this,
      lockedAt: undefined,
      lockedBy: undefined,
      updatedAt: occurredAt,
    });
  }

  isTerminal(): boolean {
    return this.status === 'DISPATCHED' || this.status === 'FAILED' || this.status === 'CANCELLED';
  }
}
