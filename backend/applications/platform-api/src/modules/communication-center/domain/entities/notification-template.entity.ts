import { AppError } from '@mentrily/service-core';
import type {
  NotificationChannel,
  NotificationTemplateStatus,
} from '../value-objects/index.js';
import {
  assertNotificationChannel,
  assertNotificationTemplateStatus,
  assertNotificationTemplateVariables,
} from '../value-objects/index.js';

export interface NotificationTemplateProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  key: string;
  name: string;
  description?: string | undefined;
  channel: NotificationChannel;
  subjectTemplate?: string | undefined;
  bodyTemplate: string;
  variables: string[];
  status: NotificationTemplateStatus;
  metadata: Record<string, unknown>;
  createdByPrincipalId: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | undefined;
}

function required(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError('VALIDATION_ERROR', `${field} is required`, 400);
  }
  return trimmed;
}

export class NotificationTemplate {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly key: string;
  readonly name: string;
  readonly description?: string | undefined;
  readonly channel: NotificationChannel;
  readonly subjectTemplate?: string | undefined;
  readonly bodyTemplate: string;
  readonly variables: string[];
  readonly status: NotificationTemplateStatus;
  readonly metadata: Record<string, unknown>;
  readonly createdByPrincipalId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt?: Date | undefined;

  constructor(props: NotificationTemplateProps) {
    this.id = required(props.id, 'id');
    this.tenantId = required(props.tenantId, 'tenantId');
    this.workspaceId = required(props.workspaceId, 'workspaceId');
    this.key = required(props.key, 'key');
    this.name = required(props.name, 'name');
    this.description = props.description?.trim() || undefined;
    this.channel = assertNotificationChannel(props.channel);
    this.subjectTemplate = props.subjectTemplate?.trim() || undefined;
    this.bodyTemplate = required(props.bodyTemplate, 'bodyTemplate');
    this.variables = assertNotificationTemplateVariables(props.variables);
    this.status = assertNotificationTemplateStatus(props.status);
    this.metadata = { ...props.metadata };
    this.createdByPrincipalId = required(props.createdByPrincipalId, 'createdByPrincipalId');
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.archivedAt = props.archivedAt;
  }

  static createDraft(
    input: Omit<NotificationTemplateProps, 'status' | 'createdAt' | 'updatedAt' | 'metadata'> & {
      metadata?: Record<string, unknown> | undefined;
      createdAt?: Date | undefined;
      updatedAt?: Date | undefined;
    },
  ): NotificationTemplate {
    const now = input.createdAt ?? new Date();
    return new NotificationTemplate({
      ...input,
      status: 'DRAFT',
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  activate(occurredAt = new Date()): NotificationTemplate {
    if (this.status === 'ARCHIVED') {
      throw new AppError('CONFLICT', 'archived template cannot be activated', 409);
    }
    return new NotificationTemplate({ ...this, status: 'ACTIVE', updatedAt: occurredAt });
  }

  archive(occurredAt = new Date()): NotificationTemplate {
    if (this.status === 'ARCHIVED') {
      throw new AppError('CONFLICT', 'template already archived', 409);
    }
    return new NotificationTemplate({
      ...this,
      status: 'ARCHIVED',
      archivedAt: occurredAt,
      updatedAt: occurredAt,
    });
  }

  updateContent(input: {
    subjectTemplate?: string | undefined;
    bodyTemplate: string;
    variables: string[];
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    occurredAt?: Date | undefined;
  }): NotificationTemplate {
    if (this.status === 'ARCHIVED') {
      throw new AppError('CONFLICT', 'archived template cannot be updated', 409);
    }
    return new NotificationTemplate({
      ...this,
      description: input.description ?? this.description,
      subjectTemplate: input.subjectTemplate,
      bodyTemplate: input.bodyTemplate,
      variables: input.variables,
      metadata: input.metadata ? { ...this.metadata, ...input.metadata } : this.metadata,
      updatedAt: input.occurredAt ?? new Date(),
    });
  }

  canRender(): boolean {
    return this.status === 'DRAFT' || this.status === 'ACTIVE';
  }
}
