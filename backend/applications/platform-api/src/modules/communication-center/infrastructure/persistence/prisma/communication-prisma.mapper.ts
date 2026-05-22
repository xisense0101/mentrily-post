import type { Prisma } from '@prisma/client';
import type {
  NotificationDeliveryAttempt,
  NotificationIntent,
  NotificationTemplate,
} from '../../../domain/entities/index.js';
import {
  NotificationDeliveryAttempt as NotificationDeliveryAttemptEntity,
  NotificationIntent as NotificationIntentEntity,
  NotificationTemplate as NotificationTemplateEntity,
  NotificationPreference as NotificationPreferenceEntity,
} from '../../../domain/entities/index.js';

type PersistenceNotificationTemplate = {
  id: string;
  tenantId: string;
  workspaceId: string;
  key: string;
  name: string;
  description: string | null;
  channel: string;
  subjectTemplate: string | null;
  bodyTemplate: string;
  variables: string[];
  status: string;
  metadata: unknown;
  createdByPrincipalId: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

type PersistenceNotificationIntent = {
  id: string;
  tenantId: string;
  workspaceId: string;
  templateId: string | null;
  channel: string;
  recipient: unknown;
  subject: string | null;
  body: string;
  priority: string;
  status: string;
  provider: string;
  scheduledFor: Date | null;
  queuedAt: Date | null;
  dispatchedAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;
  failureReason: string | null;
  metadata: unknown;
  createdByPrincipalId: string;
  createdAt: Date;
  updatedAt: Date;
};

type PersistenceNotificationDeliveryAttempt = {
  id: string;
  intentId: string;
  provider: string;
  status: string;
  attemptNumber: number;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
  metadata: unknown;
};

type PersistenceNotificationPreference = {
  id: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  channel: string;
  category: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function toDomainNotificationTemplate(
  record: PersistenceNotificationTemplate,
): NotificationTemplate {
  return new NotificationTemplateEntity({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    key: record.key,
    name: record.name,
    ...(record.description ? { description: record.description } : {}),
    channel: record.channel as NotificationTemplate['channel'],
    ...(record.subjectTemplate ? { subjectTemplate: record.subjectTemplate } : {}),
    bodyTemplate: record.bodyTemplate,
    variables: [...record.variables],
    status: record.status as NotificationTemplate['status'],
    metadata: asRecord(record.metadata),
    createdByPrincipalId: record.createdByPrincipalId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.archivedAt ? { archivedAt: record.archivedAt } : {}),
  });
}

export function toDomainNotificationIntent(
  record: PersistenceNotificationIntent,
): NotificationIntent {
  return new NotificationIntentEntity({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    ...(record.templateId ? { templateId: record.templateId } : {}),
    channel: record.channel as NotificationIntent['channel'],
    recipient: asRecord(record.recipient) as NotificationIntent['recipient'],
    ...(record.subject ? { subject: record.subject } : {}),
    body: record.body,
    priority: record.priority as NotificationIntent['priority'],
    status: record.status as NotificationIntent['status'],
    provider: record.provider as NotificationIntent['provider'],
    ...(record.scheduledFor ? { scheduledFor: record.scheduledFor } : {}),
    ...(record.queuedAt ? { queuedAt: record.queuedAt } : {}),
    ...(record.dispatchedAt ? { dispatchedAt: record.dispatchedAt } : {}),
    ...(record.failedAt ? { failedAt: record.failedAt } : {}),
    ...(record.cancelledAt ? { cancelledAt: record.cancelledAt } : {}),
    ...(record.failureReason ? { failureReason: record.failureReason } : {}),
    metadata: asRecord(record.metadata),
    createdByPrincipalId: record.createdByPrincipalId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toPersistenceNotificationTemplateCreate(template: NotificationTemplate) {
  return {
    id: template.id,
    tenantId: template.tenantId,
    workspaceId: template.workspaceId,
    key: template.key,
    name: template.name,
    description: template.description ?? null,
    channel: template.channel,
    subjectTemplate: template.subjectTemplate ?? null,
    bodyTemplate: template.bodyTemplate,
    variables: [...template.variables],
    status: template.status,
    metadata: toInputJsonValue(template.metadata),
    createdByPrincipalId: template.createdByPrincipalId,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    archivedAt: template.archivedAt ?? null,
  };
}

export function toPersistenceNotificationTemplateUpdate(template: NotificationTemplate) {
  return {
    tenantId: template.tenantId,
    workspaceId: template.workspaceId,
    key: template.key,
    name: template.name,
    description: template.description ?? null,
    channel: template.channel,
    subjectTemplate: template.subjectTemplate ?? null,
    bodyTemplate: template.bodyTemplate,
    variables: [...template.variables],
    status: template.status,
    metadata: toInputJsonValue(template.metadata),
    createdByPrincipalId: template.createdByPrincipalId,
    updatedAt: template.updatedAt,
    archivedAt: template.archivedAt ?? null,
  };
}

export function toPersistenceNotificationIntentCreate(intent: NotificationIntent) {
  return {
    id: intent.id,
    tenantId: intent.tenantId,
    workspaceId: intent.workspaceId,
    templateId: intent.templateId ?? null,
    channel: intent.channel,
    recipient: toInputJsonValue(intent.recipient as Record<string, unknown>),
    subject: intent.subject ?? null,
    body: intent.body,
    priority: intent.priority,
    status: intent.status,
    provider: intent.provider,
    scheduledFor: intent.scheduledFor ?? null,
    queuedAt: intent.queuedAt ?? null,
    dispatchedAt: intent.dispatchedAt ?? null,
    failedAt: intent.failedAt ?? null,
    cancelledAt: intent.cancelledAt ?? null,
    failureReason: intent.failureReason ?? null,
    metadata: toInputJsonValue(intent.metadata),
    createdByPrincipalId: intent.createdByPrincipalId,
    createdAt: intent.createdAt,
    updatedAt: intent.updatedAt,
  };
}

export function toPersistenceNotificationIntentUpdate(intent: NotificationIntent) {
  return {
    tenantId: intent.tenantId,
    workspaceId: intent.workspaceId,
    templateId: intent.templateId ?? null,
    channel: intent.channel,
    recipient: toInputJsonValue(intent.recipient as Record<string, unknown>),
    subject: intent.subject ?? null,
    body: intent.body,
    priority: intent.priority,
    status: intent.status,
    provider: intent.provider,
    scheduledFor: intent.scheduledFor ?? null,
    queuedAt: intent.queuedAt ?? null,
    dispatchedAt: intent.dispatchedAt ?? null,
    failedAt: intent.failedAt ?? null,
    cancelledAt: intent.cancelledAt ?? null,
    failureReason: intent.failureReason ?? null,
    metadata: toInputJsonValue(intent.metadata),
    createdByPrincipalId: intent.createdByPrincipalId,
    updatedAt: intent.updatedAt,
  };
}

export function toDomainNotificationDeliveryAttempt(
  record: PersistenceNotificationDeliveryAttempt,
): NotificationDeliveryAttempt {
  return new NotificationDeliveryAttemptEntity({
    id: record.id,
    intentId: record.intentId,
    provider: record.provider as NotificationDeliveryAttempt['provider'],
    status: record.status as NotificationDeliveryAttempt['status'],
    attemptNumber: record.attemptNumber,
    ...(record.providerMessageId ? { providerMessageId: record.providerMessageId } : {}),
    ...(record.errorCode ? { errorCode: record.errorCode } : {}),
    ...(record.errorMessage ? { errorMessage: record.errorMessage } : {}),
    createdAt: record.createdAt,
    ...(record.completedAt ? { completedAt: record.completedAt } : {}),
    metadata: asRecord(record.metadata),
  });
}

export function toPersistenceNotificationDeliveryAttemptCreate(
  attempt: NotificationDeliveryAttempt,
) {
  return {
    id: attempt.id,
    intentId: attempt.intentId,
    provider: attempt.provider,
    status: attempt.status,
    attemptNumber: attempt.attemptNumber,
    providerMessageId: attempt.providerMessageId ?? null,
    errorCode: attempt.errorCode ?? null,
    errorMessage: attempt.errorMessage ?? null,
    createdAt: attempt.createdAt,
    completedAt: attempt.completedAt ?? null,
    metadata: toInputJsonValue(attempt.metadata),
  };
}

export function toPersistenceNotificationDeliveryAttemptUpdate(
  attempt: NotificationDeliveryAttempt,
) {
  return {
    intentId: attempt.intentId,
    provider: attempt.provider,
    status: attempt.status,
    attemptNumber: attempt.attemptNumber,
    providerMessageId: attempt.providerMessageId ?? null,
    errorCode: attempt.errorCode ?? null,
    errorMessage: attempt.errorMessage ?? null,
    createdAt: attempt.createdAt,
    completedAt: attempt.completedAt ?? null,
    metadata: toInputJsonValue(attempt.metadata),
  };
}

export function toDomainNotificationPreference(record: PersistenceNotificationPreference) {
  return new NotificationPreferenceEntity({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    userId: record.userId,
    channel: record.channel as NotificationPreferenceEntity['channel'],
    category: record.category as NotificationPreferenceEntity['category'],
    enabled: record.enabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toPersistenceNotificationPreferenceCreate(
  preference: NotificationPreferenceEntity,
) {
  return {
    id: preference.id,
    tenantId: preference.tenantId,
    workspaceId: preference.workspaceId,
    userId: preference.userId,
    channel: preference.channel,
    category: preference.category,
    enabled: preference.enabled,
    createdAt: preference.createdAt,
    updatedAt: preference.updatedAt,
  };
}

export function toPersistenceNotificationPreferenceUpdate(
  preference: NotificationPreferenceEntity,
) {
  return {
    tenantId: preference.tenantId,
    workspaceId: preference.workspaceId,
    userId: preference.userId,
    channel: preference.channel,
    category: preference.category,
    enabled: preference.enabled,
    updatedAt: preference.updatedAt,
  };
}
