export type MediaAssetStatusContract =
  | 'PENDING_UPLOAD'
  | 'AVAILABLE'
  | 'ARCHIVED'
  | 'FAILED';

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
  objectKey: string;
  visibility: MediaAssetVisibilityContract;
  status: MediaAssetStatusContract;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | undefined;
}

export interface MediaUploadIntentContract {
  id: string;
  assetId: string;
  ownerPrincipalId: string;
  objectKey: string;
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
