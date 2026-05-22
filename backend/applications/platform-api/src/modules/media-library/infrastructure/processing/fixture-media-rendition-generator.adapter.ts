import { Injectable } from '@nestjs/common';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaRenditionKind } from '../../domain/value-objects/index.js';
import type {
  MediaRenditionGeneratorPort,
  RenditionGenerationResult,
} from '../../application/ports/media-rendition-generator.port.js';

@Injectable()
export class FixtureMediaRenditionGenerator implements MediaRenditionGeneratorPort {
  async generateRendition(
    asset: MediaAsset,
    tempFilePath: string,
    targetKind: MediaRenditionKind,
  ): Promise<RenditionGenerationResult> {
    const isThumbnail = targetKind === 'THUMBNAIL';

    return {
      kind: targetKind,
      tempFilePath: '/tmp/fixture-rendition.bin',
      mimeType: isThumbnail ? 'image/jpeg' : asset.contentType,
      sizeBytes: 1024 * 500, // 500KB
      ...(isThumbnail ? { width: 320, height: 240 } : { width: 1280, height: 720, durationSeconds: 120 }),
    };
  }
}
