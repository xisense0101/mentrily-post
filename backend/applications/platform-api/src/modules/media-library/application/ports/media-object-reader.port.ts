import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';

export const MEDIA_OBJECT_READER = Symbol('MEDIA_OBJECT_READER');

export interface MediaObjectReaderPort {
  /**
   * Downloads the media asset from storage to a temporary local file for processing.
   */
  downloadToTemp(asset: MediaAsset): Promise<string>;
  
  /**
   * Cleans up the temporary local file.
   */
  cleanupTemp(tempFilePath: string): Promise<void>;
}
