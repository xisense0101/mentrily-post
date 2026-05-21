import type { MediaFileCategoryContract } from '@mentrily/contract-catalog';

export interface CreateMediaUploadIntentInput {
  filename: string;
  contentType: string;
  fileCategory: MediaFileCategoryContract;
  maxSizeBytes: number;
  visibility?: 'PRIVATE' | 'WORKSPACE' | undefined;
  metadata?: Record<string, unknown> | undefined;
}
