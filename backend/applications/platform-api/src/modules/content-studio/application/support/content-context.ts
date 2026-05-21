import { AppError, RequestContext, WorkspaceContext } from '@mentrily/service-core';
import { ContentDocument } from '../../domain/entities/index.js';

export function requireContentWorkspace(context: RequestContext): WorkspaceContext {
  const workspace = context.workspace;
  if (!workspace) {
    throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
  }

  return workspace;
}

export function requireContentActor(context: RequestContext): WorkspaceContext & { actorId: string } {
  const workspace = requireContentWorkspace(context);
  if (!workspace.actorId) {
    throw new AppError('UNAUTHORIZED', 'missing actor', 401);
  }

  return workspace as WorkspaceContext & { actorId: string };
}

export function ensureDocumentOwnership(document: ContentDocument, context: RequestContext): void {
  const workspace = requireContentWorkspace(context);
  if (document.tenantId !== workspace.tenantId || document.workspaceId !== workspace.workspaceId) {
    throw new AppError('NOT_FOUND', 'content document not found', 404);
  }
}
