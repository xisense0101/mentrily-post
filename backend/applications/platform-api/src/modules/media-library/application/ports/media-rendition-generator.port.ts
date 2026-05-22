import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaRenditionKind } from '../../domain/value-objects/index.js';

export interface RenditionGenerationResult {
  kind: MediaRenditionKind;
  tempFilePath: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export const MEDIA_RENDITION_GENERATOR = Symbol('MEDIA_RENDITION_GENERATOR');

export interface MediaRenditionGeneratorPort {
  generateRendition(
    asset: MediaAsset,
    tempFilePath: string,
    targetKind: MediaRenditionKind,
  ): Promise<RenditionGenerationResult>;
}
