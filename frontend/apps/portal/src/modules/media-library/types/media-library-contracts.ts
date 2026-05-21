import type {
  CompleteMediaUploadRequest,
  CreateMediaUploadIntentRequest,
  MediaAssetContract,
  MediaAssetStatusContract,
  MediaAssetVisibilityContract,
  MediaFileCategoryContract,
  MediaReadUrlContract,
  MediaStorageProviderContract,
  MediaUploadIntentContract,
  MediaUploadIntentStatusContract,
} from '../../../contracts';

export type {
  CompleteMediaUploadRequest,
  CreateMediaUploadIntentRequest,
  MediaAssetContract,
  MediaAssetStatusContract,
  MediaAssetVisibilityContract,
  MediaFileCategoryContract,
  MediaReadUrlContract,
  MediaStorageProviderContract,
  MediaUploadIntentContract,
  MediaUploadIntentStatusContract,
};

export type MediaUploadQueueItemStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'READY'
  | 'UPLOADING'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface MediaUploadProgressState {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface MediaUploadQueueItem {
  id: string;
  file: File;
  fileCategory: MediaFileCategoryContract;
  status: MediaUploadQueueItemStatus;
  progress: MediaUploadProgressState;
  error?: string | undefined;
  asset?: MediaAssetContract | undefined;
  uploadIntent?: MediaUploadIntentContract | undefined;
}

export interface MediaAssetPickerSelection {
  assetIds: string[];
  assets: MediaAssetContract[];
}
