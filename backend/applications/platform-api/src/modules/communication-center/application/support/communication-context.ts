import { AppError, type RequestContext, type WorkspaceContext } from '@mentrily/service-core';
import type { NotificationIntent, NotificationTemplate } from '../../domain/entities/index.js';

export function requireCommunicationWorkspace(context: RequestContext): WorkspaceContext {
  const workspace = context.workspace;
  if (!workspace) {
    throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
  }
  return workspace;
}

export function requireCommunicationActor(context: RequestContext): WorkspaceContext & { actorId: string } {
  const workspace = requireCommunicationWorkspace(context);
  if (!workspace.actorId) {
    throw new AppError('UNAUTHORIZED', 'missing actor', 401);
  }
  return workspace as WorkspaceContext & { actorId: string };
}

export function ensureNotificationTemplateOwnership(template: NotificationTemplate, context: RequestContext): void {
  const workspace = requireCommunicationWorkspace(context);
  if (template.tenantId !== workspace.tenantId || template.workspaceId !== workspace.workspaceId) {
    throw new AppError('NOT_FOUND', 'notification template not found', 404);
  }
}

export function ensureNotificationIntentOwnership(intent: NotificationIntent, context: RequestContext): void {
  const workspace = requireCommunicationWorkspace(context);
  if (intent.tenantId !== workspace.tenantId || intent.workspaceId !== workspace.workspaceId) {
    throw new AppError('NOT_FOUND', 'notification intent not found', 404);
  }
}
