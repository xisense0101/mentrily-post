export const MediaScanStatuses = [
  'UNSCANNED',
  'SCAN_QUEUED',
  'SCANNING',
  'CLEAN',
  'SUSPICIOUS',
  'INFECTED',
  'QUARANTINED',
  'SCAN_FAILED',
] as const;
export type MediaScanStatus = (typeof MediaScanStatuses)[number];

export function isMediaScanStatus(value: string): value is MediaScanStatus {
  return MediaScanStatuses.includes(value as MediaScanStatus);
}
