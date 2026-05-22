import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';

export const MEDIA_OBJECT_WRITER = Symbol('MEDIA_OBJECT_WRITER');

export interface MediaObjectWriterPort {
  /**
   * Uploads a locally processed file (e.g., rendition) to the storage provider
   * and returns the generated object key.
   */
  uploadFromTemp(
    asset: MediaAsset,
    tempFilePath: string,
    contentType: string,
    prefix: string,
  ): Promise<string>;
}
