export const MediaProcessingJobStatuses = [
  'QUEUED',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'RETRYING',
  'DEAD',
] as const;
export type MediaProcessingJobStatus = (typeof MediaProcessingJobStatuses)[number];

export function isMediaProcessingJobStatus(value: string): value is MediaProcessingJobStatus {
  return MediaProcessingJobStatuses.includes(value as MediaProcessingJobStatus);
}
