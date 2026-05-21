import type { NotificationTemplate } from '../../domain/entities/index.js';
import type { NotificationTemplateResponse } from '../dto/index.js';

export function mapNotificationTemplateToResponse(template: NotificationTemplate): NotificationTemplateResponse {
  return {
    id: template.id,
    key: template.key,
    name: template.name,
    ...(template.description ? { description: template.description } : {}),
    channel: template.channel,
    ...(template.subjectTemplate ? { subjectTemplate: template.subjectTemplate } : {}),
    bodyTemplate: template.bodyTemplate,
    variables: [...template.variables],
    status: template.status,
    metadata: { ...template.metadata },
    createdByPrincipalId: template.createdByPrincipalId,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    ...(template.archivedAt ? { archivedAt: template.archivedAt.toISOString() } : {}),
  };
}
