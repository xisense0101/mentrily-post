import type { NotificationIntent } from '../../domain/entities/index.js';
import type { NotificationIntentResponse } from '../dto/index.js';

export function mapNotificationIntentToResponse(intent: NotificationIntent): NotificationIntentResponse {
  return {
    id: intent.id,
    ...(intent.templateId ? { templateId: intent.templateId } : {}),
    channel: intent.channel,
    recipient: { ...intent.recipient },
    ...(intent.subject ? { subject: intent.subject } : {}),
    body: intent.body,
    priority: intent.priority,
    status: intent.status,
    provider: intent.provider,
    ...(intent.scheduledFor ? { scheduledFor: intent.scheduledFor.toISOString() } : {}),
    ...(intent.queuedAt ? { queuedAt: intent.queuedAt.toISOString() } : {}),
    ...(intent.dispatchedAt ? { dispatchedAt: intent.dispatchedAt.toISOString() } : {}),
    ...(intent.failedAt ? { failedAt: intent.failedAt.toISOString() } : {}),
    ...(intent.cancelledAt ? { cancelledAt: intent.cancelledAt.toISOString() } : {}),
    ...(intent.failureReason ? { failureReason: intent.failureReason } : {}),
    metadata: { ...intent.metadata },
    createdByPrincipalId: intent.createdByPrincipalId,
    createdAt: intent.createdAt.toISOString(),
    updatedAt: intent.updatedAt.toISOString(),
  };
}
