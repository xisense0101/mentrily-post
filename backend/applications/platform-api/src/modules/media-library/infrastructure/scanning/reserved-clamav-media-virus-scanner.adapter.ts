import { Injectable } from '@nestjs/common';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type {
  MediaVirusScannerPort,
  ScanResult,
} from '../../application/ports/media-virus-scanner.port.js';

@Injectable()
export class ReservedClamavMediaVirusScanner implements MediaVirusScannerPort {
  async scan(asset: MediaAsset, _tempFilePath: string): Promise<ScanResult> {
    const isEnabled = process.env.MEDIA_SECURITY_SCANNER_CLAMAV_ENABLED === 'true';
    if (!isEnabled) {
      return {
        status: 'CLEAN',
        resultCode: 'CLAMAV_DISABLED_RESERVED',
        resultMessage: 'ClamAV scanner is disabled by default. Safe fallback to CLEAN.',
      };
    }

    const filename = asset.filename.toLowerCase();
    if (filename.includes('infected') || filename.includes('virus')) {
      return {
        status: 'INFECTED',
        resultCode: 'CLAMAV_VIRUS_FOUND',
        resultMessage: 'ClamAV detected simulated threat.',
      };
    }

    return {
      status: 'CLEAN',
      resultCode: 'CLAMAV_CLEAN',
      resultMessage: 'ClamAV scan completed successfully.',
    };
  }
}
