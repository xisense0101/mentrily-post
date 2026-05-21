export const MediaAssetStatuses = ['PENDING_UPLOAD', 'AVAILABLE', 'ARCHIVED', 'FAILED'] as const;
export type MediaAssetStatus = (typeof MediaAssetStatuses)[number];

export function isMediaAssetStatus(value: string): value is MediaAssetStatus {
  return MediaAssetStatuses.includes(value as MediaAssetStatus);
}
