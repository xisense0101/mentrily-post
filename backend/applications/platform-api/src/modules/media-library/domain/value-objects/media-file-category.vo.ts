export const MediaFileCategories = [
  'DOCUMENT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'ARCHIVE',
  'OTHER',
] as const;
export type MediaFileCategory = (typeof MediaFileCategories)[number];
