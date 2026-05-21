export const MediaAssetVisibilities = ['PRIVATE', 'WORKSPACE'] as const;
export type MediaAssetVisibility = (typeof MediaAssetVisibilities)[number];
