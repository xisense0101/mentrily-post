import type { ContentBlockResponse } from './content-document-response.dto.js';

export interface ContentPublishedSnapshotResponse {
  id: string;
  documentId: string;
  versionId: string;
  versionNumber: number;
  publishedByPrincipalId: string;
  publishedAt: string;
  createdAt: string;
  blocks: ContentBlockResponse[];
}
