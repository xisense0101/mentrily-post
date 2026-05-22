import { Injectable } from '@nestjs/common';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaVirusScannerPort, ScanResult } from '../../application/ports/media-virus-scanner.port.js';

@Injectable()
export class NoopMediaVirusScanner implements MediaVirusScannerPort {
  async scan(asset: MediaAsset, tempFilePath: string): Promise<ScanResult> {
    return {
      status: 'CLEAN',
      resultCode: 'CLEAN_NOOP',
      resultMessage: 'Noop scanner completed successfully.',
    };
  }
}
