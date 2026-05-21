export const MediaStorageProviders = ['FIXTURE', 'S3_COMPATIBLE_RESERVED'] as const;
export type MediaStorageProvider = (typeof MediaStorageProviders)[number];
