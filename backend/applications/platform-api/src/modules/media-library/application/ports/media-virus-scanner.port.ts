import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';

export interface ScanResult {
  status: 'CLEAN' | 'INFECTED' | 'SUSPICIOUS' | 'FAILED';
  resultCode: string;
  resultMessage: string;
}

export const MEDIA_VIRUS_SCANNER = Symbol('MEDIA_VIRUS_SCANNER');

export interface MediaVirusScannerPort {
  scan(asset: MediaAsset, tempFilePath: string): Promise<ScanResult>;
}
