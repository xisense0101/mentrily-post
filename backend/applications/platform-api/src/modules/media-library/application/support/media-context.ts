import { AppError, RequestContext, WorkspaceContext } from '@mentrily/service-core';
import type { MediaAsset, MediaUploadIntent } from '../../domain/entities/index.js';

export function requireMediaWorkspace(context: RequestContext): WorkspaceContext {
  const workspace = context.workspace;
  if (!workspace) {
    throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
  }

  return workspace;
}

export function requireMediaActor(context: RequestContext): WorkspaceContext & { actorId: string } {
  const workspace = requireMediaWorkspace(context);
  if (!workspace.actorId) {
    throw new AppError('UNAUTHORIZED', 'missing actor', 401);
  }

  return workspace as WorkspaceContext & { actorId: string };
}

export function ensureMediaAssetOwnership(asset: MediaAsset, context: RequestContext): void {
  const workspace = requireMediaWorkspace(context);
  if (asset.tenantId !== workspace.tenantId || asset.workspaceId !== workspace.workspaceId) {
    throw new AppError('NOT_FOUND', 'media asset not found', 404);
  }
}

export function ensureMediaUploadIntentOwnership(
  intent: MediaUploadIntent,
  context: RequestContext,
): void {
  const workspace = requireMediaWorkspace(context);
  if (intent.tenantId !== workspace.tenantId || intent.workspaceId !== workspace.workspaceId) {
    throw new AppError('NOT_FOUND', 'media upload intent not found', 404);
  }
}
