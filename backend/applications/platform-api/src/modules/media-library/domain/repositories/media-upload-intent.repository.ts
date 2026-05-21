import type { TransactionContext } from '@mentrily/service-core';
import type { MediaUploadIntent } from '../entities/index.js';

export abstract class MediaUploadIntentRepository {
  abstract save(
    intent: MediaUploadIntent,
    transaction?: TransactionContext,
  ): Promise<MediaUploadIntent>;
  abstract findById(
    id: string,
    transaction?: TransactionContext,
  ): Promise<MediaUploadIntent | null>;
  abstract findByAssetId(
    assetId: string,
    transaction?: TransactionContext,
  ): Promise<MediaUploadIntent[]>;
}
