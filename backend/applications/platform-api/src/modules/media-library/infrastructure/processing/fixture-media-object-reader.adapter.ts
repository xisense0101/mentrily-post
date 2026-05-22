import { Injectable } from '@nestjs/common';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaObjectReaderPort } from '../../application/ports/media-object-reader.port.js';

@Injectable()
export class FixtureMediaObjectReader implements MediaObjectReaderPort {
  async downloadToTemp(_asset: MediaAsset): Promise<string> {
    return '/tmp/fixture-downloaded-asset.bin';
  }

  async cleanupTemp(_tempFilePath: string): Promise<void> {
    // No-op for fixture
  }
}
