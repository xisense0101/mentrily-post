import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaProcessingJob } from '../../domain/entities/media-processing-job.entity.js';
import type {
  MediaProcessingHookStage,
  MediaProcessingSummary,
} from './media-processing-template.types.js';

export interface MediaProcessingHookContext {
  asset: MediaAsset;
  job: MediaProcessingJob;
  stage: MediaProcessingHookStage;
  processingSummary: MediaProcessingSummary;
}

export interface MediaProcessingHookDefinition {
  key: 'SYNC_PROCESSING_SUMMARY';
  stages: MediaProcessingHookStage[];
  critical: false;
}
