import type { TransactionContext } from '@mentrily/service-core';
import type { MediaAsset } from '../entities/index.js';
import type { MediaAssetStatus, MediaFileCategory } from '../value-objects/index.js';

export abstract class MediaAssetRepository {
  abstract save(asset: MediaAsset, transaction?: TransactionContext): Promise<MediaAsset>;
  abstract findById(id: string, transaction?: TransactionContext): Promise<MediaAsset | null>;
  abstract listByWorkspace(
    input: {
      workspaceId: string;
      status?: MediaAssetStatus | undefined;
      fileCategory?: MediaFileCategory | undefined;
      ownerPrincipalId?: string | undefined;
    },
    transaction?: TransactionContext,
  ): Promise<MediaAsset[]>;
}
