import type {
  MediaAssetStatusContract,
  MediaAssetVisibilityContract,
  MediaFileCategoryContract,
  MediaStorageProviderContract,
} from '@mentrily/contract-catalog';

export interface MediaAssetResponse {
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
}
