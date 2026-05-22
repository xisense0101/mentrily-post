import { Injectable } from '@nestjs/common';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type {
  ExtractedMediaMetadata,
  MediaMetadataExtractorPort,
} from '../../application/ports/media-metadata-extractor.port.js';

@Injectable()
export class FixtureMediaMetadataExtractor implements MediaMetadataExtractorPort {
  async extractMetadata(asset: MediaAsset, _tempFilePath: string): Promise<ExtractedMediaMetadata> {
    const isImage = asset.contentType.startsWith('image/');
    const isVideo = asset.contentType.startsWith('video/');

    return {
      sizeBytes: 1024 * 1024, // 1MB mock
      format: asset.contentType,
      ...(isImage ? { width: 1920, height: 1080 } : {}),
      ...(isVideo ? { width: 1920, height: 1080, durationSeconds: 120, codec: 'h264' } : {}),
    };
  }
}
