import { AppError, RequestContext } from '@mentrily/service-core';
import { MediaAssetRepository } from '../../../media-library/domain/repositories/index.js';
import type { ContentBlockInput } from '../dto/index.js';
import { BlockContentKind } from '../../domain/index.js';

export async function validateContentMediaReferences(
  assetRepository: MediaAssetRepository,
  context: RequestContext,
  blocks: ContentBlockInput[],
): Promise<void> {
  const workspace = context.workspace;
  if (!workspace) {
    throw new AppError('UNAUTHORIZED', 'missing workspace context', 401);
  }

  for (const block of blocks) {
    const isMediaKind =
      block.kind === BlockContentKind.IMAGE ||
      block.kind === BlockContentKind.VIDEO ||
      block.kind === BlockContentKind.FILE;

    if (!isMediaKind) {
      continue;
    }

    const mediaAssetId = block.content?.mediaAssetId;
    if (typeof mediaAssetId === 'string' && mediaAssetId.trim().length > 0) {
      const asset = await assetRepository.findById(mediaAssetId);
      if (!asset) {
        throw new AppError('VALIDATION_ERROR', 'referenced media asset not found', 400, {
          assetId: mediaAssetId,
        });
      }

      if (asset.tenantId !== workspace.tenantId || asset.workspaceId !== workspace.workspaceId) {
        throw new AppError('VALIDATION_ERROR', 'referenced media asset does not belong to this workspace', 400, {
          assetId: asset.id,
        });
      }

      if (asset.status !== 'AVAILABLE' || asset.scanStatus !== 'CLEAN') {
        throw new AppError('VALIDATION_ERROR', 'referenced media asset is not available or clean', 400, {
          assetId: asset.id,
          status: asset.status,
          scanStatus: asset.scanStatus,
        });
      }

      if (block.kind === BlockContentKind.IMAGE && asset.fileCategory !== 'IMAGE') {
        throw new AppError('VALIDATION_ERROR', 'IMAGE block requires an IMAGE media asset', 400);
      }
      if (block.kind === BlockContentKind.VIDEO && asset.fileCategory !== 'VIDEO') {
        throw new AppError('VALIDATION_ERROR', 'VIDEO block requires a VIDEO media asset', 400);
      }
    }
  }
}
