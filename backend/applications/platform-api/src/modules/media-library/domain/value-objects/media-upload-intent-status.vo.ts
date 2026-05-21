export const MediaUploadIntentStatuses = [
  'PENDING',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
  'FAILED',
] as const;
export type MediaUploadIntentStatus = (typeof MediaUploadIntentStatuses)[number];

export function isMediaUploadIntentStatus(value: string): value is MediaUploadIntentStatus {
  return MediaUploadIntentStatuses.includes(value as MediaUploadIntentStatus);
}
