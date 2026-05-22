import type {
  MediaFileCategoryContract,
  MediaUploadIntentStatusContract,
} from '@mentrily/contract-catalog';

export interface MediaReadUrlResponse {
  url: string;
  method: 'GET';
  headers: Record<string, string>;
  expiresAt: string;
}

export interface MediaUploadIntentResponse {
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
