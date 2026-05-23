import { Injectable } from '@nestjs/common';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type {
  MediaVirusScannerPort,
  ScanResult,
} from '../../application/ports/media-virus-scanner.port.js';

@Injectable()
export class FixtureMediaVirusScanner implements MediaVirusScannerPort {
  async scan(asset: MediaAsset, _tempFilePath: string): Promise<ScanResult> {
    const filename = asset.filename.toLowerCase();
    if (filename.includes('infected') || filename.includes('virus')) {
      return {
        status: 'INFECTED',
        resultCode: 'VIRUS_FOUND',
        resultMessage: 'Fixture scanner detected a simulated virus.',
      };
    }
    if (filename.includes('suspicious')) {
      return {
        status: 'SUSPICIOUS',
        resultCode: 'SUSPICIOUS_PATTERN',
        resultMessage: 'Fixture scanner detected a suspicious pattern.',
      };
    }
    if (filename.includes('fail') || filename.includes('error')) {
      return {
        status: 'FAILED',
        resultCode: 'SCANNER_ERROR',
        resultMessage: 'Fixture scanner simulated failure.',
      };
    }
    return {
      status: 'CLEAN',
      resultCode: 'CLEAN_FIXTURE',
      resultMessage: 'Fixture scanner completed successfully with clean result.',
    };
  }
}
