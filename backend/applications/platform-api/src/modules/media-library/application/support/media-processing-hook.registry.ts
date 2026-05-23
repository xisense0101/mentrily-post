import type { MediaProcessingHookDefinition } from './media-processing-hook.types.js';

export const SYSTEM_MEDIA_PROCESSING_HOOKS: readonly MediaProcessingHookDefinition[] = [
  {
    key: 'SYNC_PROCESSING_SUMMARY',
    stages: [
      'PROCESSING_STARTED',
      'METADATA_EXTRACTED',
      'RENDITION_CREATED',
      'PROCESSING_SUCCEEDED',
      'PROCESSING_FAILED',
    ],
    critical: false,
  },
] as const;
