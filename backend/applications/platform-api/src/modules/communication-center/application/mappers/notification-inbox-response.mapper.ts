import type { NotificationIntent } from '../../domain/entities/index.js';
import type { NotificationInboxItemResponse } from '../dto/index.js';

function resolveInboxStatus(intent: NotificationIntent): NotificationInboxItemResponse['status'] {
  if (typeof intent.metadata.archivedAt === 'string') {
    return 'ARCHIVED';
  }
  if (typeof intent.metadata.readAt === 'string') {
    return 'READ';
  }
  return 'UNREAD';
}

export function mapNotificationIntentToInboxResponse(
  intent: NotificationIntent,
): NotificationInboxItemResponse {
  return {
    id: intent.id,
    channel: intent.channel,
    recipient: { ...intent.recipient },
    ...(intent.subject ? { subject: intent.subject } : {}),
    body: intent.body,
    priority: intent.priority,
    status: resolveInboxStatus(intent),
    readAt: typeof intent.metadata.readAt === 'string' ? intent.metadata.readAt : undefined,
    archivedAt:
      typeof intent.metadata.archivedAt === 'string' ? intent.metadata.archivedAt : undefined,
    createdAt: intent.createdAt.toISOString(),
    updatedAt: intent.updatedAt.toISOString(),
  };
}
