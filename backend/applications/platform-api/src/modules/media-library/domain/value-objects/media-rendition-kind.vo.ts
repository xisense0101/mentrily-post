export const MediaRenditionKinds = [
  'THUMBNAIL',
  'PREVIEW',
  'TRANSCODED_VIDEO',
  'TRANSCODED_AUDIO',
] as const;
export type MediaRenditionKind = (typeof MediaRenditionKinds)[number];

export function isMediaRenditionKind(value: string): value is MediaRenditionKind {
  return MediaRenditionKinds.includes(value as MediaRenditionKind);
}
