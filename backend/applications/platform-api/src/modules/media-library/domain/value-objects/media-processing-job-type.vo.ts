export const MediaProcessingJobTypes = [
  'METADATA_EXTRACTION',
  'THUMBNAIL_GENERATION',
  'TRANSCODING',
] as const;
export type MediaProcessingJobType = (typeof MediaProcessingJobTypes)[number];

export function isMediaProcessingJobType(value: string): value is MediaProcessingJobType {
  return MediaProcessingJobTypes.includes(value as MediaProcessingJobType);
}
