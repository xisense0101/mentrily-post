import type { MediaUploadIntent } from '../../domain/entities/index.js';
import type { MediaReadUrlResponse, MediaUploadIntentResponse } from '../dto/index.js';

export function mapMediaUploadIntentToResponse(
  intent: MediaUploadIntent,
): MediaUploadIntentResponse {
  return {
    id: intent.id,
    assetId: intent.assetId,
    ownerPrincipalId: intent.ownerPrincipalId,
    contentType: intent.contentType,
    filename: intent.filename,
    fileCategory: intent.fileCategory,
    maxSizeBytes: intent.maxSizeBytes,
    status: intent.status,
    uploadUrl: intent.uploadUrl,
    uploadMethod: intent.uploadMethod,
    headers: { ...intent.headers },
    expiresAt: intent.expiresAt.toISOString(),
    createdAt: intent.createdAt.toISOString(),
    ...(intent.completedAt ? { completedAt: intent.completedAt.toISOString() } : {}),
    ...(intent.cancelledAt ? { cancelledAt: intent.cancelledAt.toISOString() } : {}),
    ...(intent.failedAt ? { failedAt: intent.failedAt.toISOString() } : {}),
    metadata: { ...intent.metadata },
  };
}

export function mapMediaReadUrlToResponse(input: {
  url: string;
  method: 'GET';
  headers: Record<string, string>;
  expiresAt: Date;
}): MediaReadUrlResponse {
  return {
    url: input.url,
    method: input.method,
    headers: { ...input.headers },
    expiresAt: input.expiresAt.toISOString(),
  };
}
