export type MediaAssetStatusContract =
  | 'PENDING_UPLOAD'
  | 'UPLOADED'
  | 'PROCESSING_QUEUED'
  | 'PROCESSING'
  | 'AVAILABLE'
  | 'PROCESSING_FAILED'
  | 'ARCHIVED'
  | 'FAILED'
  | 'ABANDONED'
  | 'DELETE_QUEUED'
  | 'DELETED';

export type MediaUploadIntentStatusContract =
  | 'PENDING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED';

export type MediaAssetVisibilityContract = 'PRIVATE' | 'WORKSPACE';

export type MediaFileCategoryContract =
  | 'DOCUMENT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'ARCHIVE'
  | 'OTHER';

export type MediaStorageProviderContract = 'FIXTURE' | 'S3_COMPATIBLE_RESERVED';

export interface MediaAssetContract {
  id: string;
  ownerPrincipalId: string;
  filename: string;
  contentType: string;
  fileCategory: MediaFileCategoryContract;
  sizeBytes?: number | undefined;
  checksumSha256?: string | undefined;
  storageProvider: MediaStorageProviderContract;
  visibility: MediaAssetVisibilityContract;
  status: MediaAssetStatusContract;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | undefined;
  scanStatus: MediaScanStatusContract;
  scannedAt?: string | undefined;
  quarantine?: MediaQuarantineStatusContract | undefined;
  processingTemplate?: MediaProcessingTemplateSummaryContract | undefined;
  processingSummary?: MediaProcessingSummaryContract | undefined;
}

export interface MediaUploadIntentContract {
  id: string;
  assetId: string;
  ownerPrincipalId: string;
  contentType: string;
  filename: string;
  fileCategory: MediaFileCategoryContract;
  maxSizeBytes: number;
  status: MediaUploadIntentStatusContract;
  uploadUrl: string;
  uploadMethod: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
  createdAt: string;
  completedAt?: string | undefined;
  cancelledAt?: string | undefined;
  failedAt?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface CreateMediaUploadIntentRequest {
  filename: string;
  contentType: string;
  fileCategory: MediaFileCategoryContract;
  maxSizeBytes: number;
  visibility?: MediaAssetVisibilityContract | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface CompleteMediaUploadRequest {
  sizeBytes?: number | undefined;
  checksumSha256?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface MediaReadUrlContract {
  url: string;
  method: 'GET';
  headers: Record<string, string>;
  expiresAt: string;
}

export type MediaProcessingJobTypeContract =
  | 'METADATA_EXTRACTION'
  | 'THUMBNAIL_GENERATION'
  | 'TRANSCODING';

export type MediaProcessingJobStatusContract =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD';

export interface MediaProcessingJobContract {
  id: string;
  jobType: MediaProcessingJobTypeContract;
  status: MediaProcessingJobStatusContract;
  attempts: number;
  maxAttempts: number;
  runAfter: string;
  createdAt: string;
  updatedAt: string;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
}

export type MediaRenditionKindContract =
  | 'THUMBNAIL'
  | 'PREVIEW'
  | 'TRANSCODED_VIDEO'
  | 'TRANSCODED_AUDIO';

export interface MediaRenditionContract {
  id: string;
  kind: MediaRenditionKindContract;
  mimeType: string;
  sizeBytes: number;
  width?: number | undefined;
  height?: number | undefined;
  durationSeconds?: number | undefined;
  createdAt: string;
  updatedAt: string;
}

export type MediaProcessingTemplateKeyContract =
  | 'IMAGE_STANDARD'
  | 'VIDEO_RESERVED_STANDARD'
  | 'AUDIO_RESERVED_STANDARD'
  | 'DOCUMENT_STANDARD'
  | 'GENERIC_FILE_STANDARD';

export type MediaProcessingHookStageContract =
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

export type MediaRenditionPlanStatusContract = 'AVAILABLE' | 'DEFERRED' | 'SKIPPED';

export interface MediaProcessingTemplateSummaryContract {
  key: MediaProcessingTemplateKeyContract;
  name: string;
  description: string;
  fileCategory: MediaFileCategoryContract;
}

export interface MediaProcessingMetadataPolicyContract {
  extractBasicMetadata: boolean;
  extractImageDimensions: boolean;
  extractDuration: boolean;
  extractChecksum: boolean;
}

export interface MediaPlannedRenditionSummaryContract {
  kind: MediaRenditionKindContract;
  label: string;
  status: MediaRenditionPlanStatusContract;
  format: string;
  width?: number | undefined;
  height?: number | undefined;
}

export interface MediaProcessingSummaryContract {
  template: MediaProcessingTemplateSummaryContract;
  metadata: MediaProcessingMetadataPolicyContract;
  plannedRenditions: MediaPlannedRenditionSummaryContract[];
  completedHookStages: MediaProcessingHookStageContract[];
  lastProcessedAt?: string | undefined;
}

export interface MediaAssetWithProcessingContract extends MediaAssetContract {
  processingJobs: MediaProcessingJobContract[];
  renditions: MediaRenditionContract[];
}

export type MediaScanStatusContract =
  | 'UNSCANNED'
  | 'SCAN_QUEUED'
  | 'SCANNING'
  | 'CLEAN'
  | 'SUSPICIOUS'
  | 'INFECTED'
  | 'QUARANTINED'
  | 'SCAN_FAILED';

export interface MediaQuarantineStatusContract {
  isQuarantined: boolean;
  quarantinedAt?: string | undefined;
  quarantineReason?: string | undefined;
}

export type MediaLifecycleStatusContract =
  | 'PENDING'
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'ABANDONED'
  | 'DELETE_QUEUED'
  | 'DELETED';

export type MediaDeliveryModeContract =
  | 'PRIVATE_SIGNED_URL'
  | 'CDN_SIGNED_URL'
  | 'PUBLIC_CDN_DISABLED';

export interface MediaAccessPolicyContract {
  deliveryMode: MediaDeliveryModeContract;
  readUrlTtlSeconds?: number | undefined;
}

export interface MediaSecuritySummaryContract {
  scanStatus: MediaScanStatusContract;
  scannedAt?: string | undefined;
  quarantine?: MediaQuarantineStatusContract | undefined;
}

export interface MediaAssetSecuritySummaryContract extends MediaSecuritySummaryContract {
  assetId: string;
}

export interface MediaAssetLifecycleSummaryContract {
  assetId: string;
  status: MediaAssetStatusContract;
  deleteAfter?: string | undefined;
  archivedAt?: string | undefined;
  deletedAt?: string | undefined;
}

export interface MediaQuarantineResponseContract {
  assetId: string;
  quarantined: boolean;
  quarantineReason?: string | undefined;
}

export interface MediaRetryScanResponseContract {
  assetId: string;
  scanJobId: string;
  status: string;
}

export interface MediaSecurityScanJobContract {
  id: string;
  workspaceId: string;
  mediaAssetId: string;
  status: 'QUEUED' | 'SCANNING' | 'CLEAN' | 'INFECTED' | 'FAILED' | 'RETRYING' | 'DEAD';
  scannerProvider: 'NOOP' | 'FIXTURE' | 'CLAMAV_RESERVED' | 'EXTERNAL_RESERVED';
  attempts: number;
  maxAttempts: number;
  runAfter: string;
  resultCode?: string | undefined;
  resultMessage?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface MediaLifecycleJobContract {
  id: string;
  workspaceId: string;
  mediaAssetId?: string | undefined;
  jobType:
    | 'EXPIRE_UPLOAD'
    | 'DELETE_ASSET'
    | 'DELETE_RENDITION'
    | 'CLEAN_FAILED'
    | 'CLEAN_ORPHANED';
  status: 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'RETRYING' | 'DEAD';
  attempts: number;
  maxAttempts: number;
  runAfter: string;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  createdAt: string;
  updatedAt: string;
}
