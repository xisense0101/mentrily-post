import { AppError } from '@mentrily/service-core';
import type { MediaFileCategory } from '../../domain/value-objects/index.js';

export type MediaProcessingTemplateKey =
  | 'IMAGE_STANDARD'
  | 'VIDEO_RESERVED_STANDARD'
  | 'AUDIO_RESERVED_STANDARD'
  | 'DOCUMENT_STANDARD'
  | 'GENERIC_FILE_STANDARD';

export type MediaProcessingHookStage =
  | 'UPLOAD_COMPLETED'
  | 'SCAN_CLEAN'
  | 'SCAN_FAILED'
  | 'PROCESSING_STARTED'
  | 'METADATA_EXTRACTED'
  | 'RENDITION_CREATED'
  | 'PROCESSING_SUCCEEDED'
  | 'PROCESSING_FAILED'
  | 'ASSET_QUARANTINED'
  | 'ASSET_DELETED';

export type MediaRenditionPlanStatus = 'AVAILABLE' | 'DEFERRED' | 'SKIPPED';

export interface MediaProcessingMetadataPolicy {
  extractBasicMetadata: boolean;
  extractImageDimensions: boolean;
  extractDuration: boolean;
  extractChecksum: boolean;
}

export interface MediaImageRenditionPreset {
  kind: 'THUMBNAIL';
  width: number;
  height: number;
  format: 'image/jpeg';
  quality: number;
  fit: 'cover';
  status: 'AVAILABLE';
}

export interface MediaDeferredRenditionPreset {
  kind: 'THUMBNAIL' | 'TRANSCODED_VIDEO' | 'TRANSCODED_AUDIO' | 'PREVIEW';
  label: string;
  format: string;
  status: 'DEFERRED';
}

export interface MediaProcessingTemplateConfig {
  metadata: MediaProcessingMetadataPolicy;
  imageRenditions: MediaImageRenditionPreset[];
  deferredRenditions: MediaDeferredRenditionPreset[];
  hookStages: MediaProcessingHookStage[];
}

export interface MediaProcessingTemplateDefinition {
  key: MediaProcessingTemplateKey;
  name: string;
  description: string;
  fileCategory: MediaFileCategory;
  mimeTypePrefixes: string[];
  config: MediaProcessingTemplateConfig;
}

export interface MediaProcessingTemplateSummary {
  key: MediaProcessingTemplateKey;
  name: string;
  fileCategory: MediaFileCategory;
  description: string;
}

export interface MediaPlannedRenditionSummary {
  kind: 'THUMBNAIL' | 'PREVIEW' | 'TRANSCODED_VIDEO' | 'TRANSCODED_AUDIO';
  label: string;
  status: MediaRenditionPlanStatus;
  format: string;
  width?: number | undefined;
  height?: number | undefined;
}

export interface MediaProcessingSummary {
  template: MediaProcessingTemplateSummary;
  metadata: MediaProcessingMetadataPolicy;
  plannedRenditions: MediaPlannedRenditionSummary[];
  completedHookStages: MediaProcessingHookStage[];
  lastProcessedAt?: string | undefined;
}

function ensureBoolean(value: boolean, field: string): void {
  if (typeof value !== 'boolean') {
    throw new AppError('VALIDATION_ERROR', `${field} must be boolean`, 400);
  }
}

export function validateTemplateDefinition(
  template: MediaProcessingTemplateDefinition,
): MediaProcessingTemplateDefinition {
  if (!template.key.trim() || !template.name.trim() || !template.description.trim()) {
    throw new AppError('VALIDATION_ERROR', 'media processing template is invalid', 400);
  }

  ensureBoolean(template.config.metadata.extractBasicMetadata, 'metadata.extractBasicMetadata');
  ensureBoolean(template.config.metadata.extractImageDimensions, 'metadata.extractImageDimensions');
  ensureBoolean(template.config.metadata.extractDuration, 'metadata.extractDuration');
  ensureBoolean(template.config.metadata.extractChecksum, 'metadata.extractChecksum');

  for (const preset of template.config.imageRenditions) {
    if (preset.width <= 0 || preset.height <= 0 || preset.quality <= 0 || preset.quality > 100) {
      throw new AppError('VALIDATION_ERROR', 'image rendition preset is invalid', 400);
    }
  }

  return template;
}
