export const MediaAssetStatuses = [
  'PENDING_UPLOAD',
  'UPLOADED',
  'PROCESSING_QUEUED',
  'PROCESSING',
  'AVAILABLE',
  'PROCESSING_FAILED',
  'ARCHIVED',
  'FAILED',
  'ABANDONED',
  'DELETE_QUEUED',
  'DELETED',
] as const;
export type MediaAssetStatus = (typeof MediaAssetStatuses)[number];

export function isMediaAssetStatus(value: string): value is MediaAssetStatus {
  return MediaAssetStatuses.includes(value as MediaAssetStatus);
}
