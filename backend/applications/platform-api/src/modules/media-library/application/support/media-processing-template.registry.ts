import type { MediaFileCategory } from '../../domain/value-objects/index.js';
import {
  validateTemplateDefinition,
  type MediaProcessingTemplateDefinition,
} from './media-processing-template.types.js';

function template(
  templateDefinition: MediaProcessingTemplateDefinition,
): MediaProcessingTemplateDefinition {
  return validateTemplateDefinition(templateDefinition);
}

export const SYSTEM_MEDIA_PROCESSING_TEMPLATES: readonly MediaProcessingTemplateDefinition[] = [
  template({
    key: 'IMAGE_STANDARD',
    name: 'Image Standard',
    description: 'Extracts image metadata and generates a thumbnail rendition.',
    fileCategory: 'IMAGE',
    mimeTypePrefixes: ['image/'],
    config: {
      metadata: {
        extractBasicMetadata: true,
        extractImageDimensions: true,
        extractDuration: false,
        extractChecksum: true,
      },
      imageRenditions: [
        {
          kind: 'THUMBNAIL',
          width: 320,
          height: 240,
          format: 'image/jpeg',
          quality: 82,
          fit: 'cover',
          status: 'AVAILABLE',
        },
      ],
      deferredRenditions: [],
      hookStages: [
        'PROCESSING_STARTED',
        'METADATA_EXTRACTED',
        'RENDITION_CREATED',
        'PROCESSING_SUCCEEDED',
        'PROCESSING_FAILED',
      ],
    },
  }),
  template({
    key: 'VIDEO_RESERVED_STANDARD',
    name: 'Video Reserved Standard',
    description: 'Extracts basic video metadata and records deferred transcoding plans.',
    fileCategory: 'VIDEO',
    mimeTypePrefixes: ['video/'],
    config: {
      metadata: {
        extractBasicMetadata: true,
        extractImageDimensions: true,
        extractDuration: true,
        extractChecksum: true,
      },
      imageRenditions: [],
      deferredRenditions: [
        { kind: 'THUMBNAIL', label: 'Poster thumbnail', format: 'image/jpeg', status: 'DEFERRED' },
        {
          kind: 'TRANSCODED_VIDEO',
          label: 'Adaptive video transcode',
          format: 'video/mp4',
          status: 'DEFERRED',
        },
      ],
      hookStages: [
        'PROCESSING_STARTED',
        'METADATA_EXTRACTED',
        'PROCESSING_SUCCEEDED',
        'PROCESSING_FAILED',
      ],
    },
  }),
  template({
    key: 'AUDIO_RESERVED_STANDARD',
    name: 'Audio Reserved Standard',
    description: 'Extracts basic audio metadata and records deferred transcoding plans.',
    fileCategory: 'AUDIO',
    mimeTypePrefixes: ['audio/'],
    config: {
      metadata: {
        extractBasicMetadata: true,
        extractImageDimensions: false,
        extractDuration: true,
        extractChecksum: true,
      },
      imageRenditions: [],
      deferredRenditions: [
        {
          kind: 'TRANSCODED_AUDIO',
          label: 'Normalized audio transcode',
          format: 'audio/mpeg',
          status: 'DEFERRED',
        },
      ],
      hookStages: [
        'PROCESSING_STARTED',
        'METADATA_EXTRACTED',
        'PROCESSING_SUCCEEDED',
        'PROCESSING_FAILED',
      ],
    },
  }),
  template({
    key: 'DOCUMENT_STANDARD',
    name: 'Document Standard',
    description: 'Extracts basic document metadata and records deferred preview plans.',
    fileCategory: 'DOCUMENT',
    mimeTypePrefixes: ['application/pdf', 'application/msword', 'application/vnd.'],
    config: {
      metadata: {
        extractBasicMetadata: true,
        extractImageDimensions: false,
        extractDuration: false,
        extractChecksum: true,
      },
      imageRenditions: [],
      deferredRenditions: [
        { kind: 'PREVIEW', label: 'Document preview', format: 'image/jpeg', status: 'DEFERRED' },
      ],
      hookStages: [
        'PROCESSING_STARTED',
        'METADATA_EXTRACTED',
        'PROCESSING_SUCCEEDED',
        'PROCESSING_FAILED',
      ],
    },
  }),
  template({
    key: 'GENERIC_FILE_STANDARD',
    name: 'Generic File Standard',
    description: 'Extracts safe basic metadata only.',
    fileCategory: 'OTHER',
    mimeTypePrefixes: [],
    config: {
      metadata: {
        extractBasicMetadata: true,
        extractImageDimensions: false,
        extractDuration: false,
        extractChecksum: true,
      },
      imageRenditions: [],
      deferredRenditions: [],
      hookStages: [
        'PROCESSING_STARTED',
        'METADATA_EXTRACTED',
        'PROCESSING_SUCCEEDED',
        'PROCESSING_FAILED',
      ],
    },
  }),
] as const;

export function templateFallbackForCategory(
  fileCategory: MediaFileCategory,
): MediaProcessingTemplateDefinition {
  return (
    SYSTEM_MEDIA_PROCESSING_TEMPLATES.find((item) => item.fileCategory === fileCategory) ??
    SYSTEM_MEDIA_PROCESSING_TEMPLATES.find((item) => item.key === 'GENERIC_FILE_STANDARD')!
  );
}
