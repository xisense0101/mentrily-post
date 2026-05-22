import type { TransactionContext } from '@mentrily/service-core';
import type { MediaRendition } from '../entities/index.js';

export abstract class MediaRenditionRepository {
  abstract save(rendition: MediaRendition, transaction?: TransactionContext): Promise<MediaRendition>;
  abstract findByAssetId(mediaAssetId: string, transaction?: TransactionContext): Promise<MediaRendition[]>;
  abstract deleteByAssetId(mediaAssetId: string, transaction?: TransactionContext): Promise<void>;
}
