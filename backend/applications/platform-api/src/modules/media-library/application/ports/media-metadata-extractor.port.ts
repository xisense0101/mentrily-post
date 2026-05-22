import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';

export interface ExtractedMediaMetadata {
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  format?: string;
  codec?: string;
  [key: string]: unknown;
}

export const MEDIA_METADATA_EXTRACTOR = Symbol('MEDIA_METADATA_EXTRACTOR');

export interface MediaMetadataExtractorPort {
  extractMetadata(asset: MediaAsset, tempFilePath: string): Promise<ExtractedMediaMetadata>;
}
