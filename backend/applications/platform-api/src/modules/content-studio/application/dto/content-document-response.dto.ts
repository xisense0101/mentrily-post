import type {
  BlockContentKindContract,
  ContentDocumentPurposeContract,
  ContentDocumentStatusContract,
  ContentVersionStatusContract,
} from '@mentrily/contract-catalog';

export interface ContentBlockResponse {
  id: string;
  parentBlockId?: string | undefined;
  kind: BlockContentKindContract;
  position: number;
  path: string;
  content: Record<string, unknown>;
  metadata?: Record<string, unknown> | undefined;
}

export interface ContentVersionResponse {
  id: string;
  versionNumber: number;
  status: ContentVersionStatusContract;
  createdByPrincipalId: string;
  createdAt: string;
  publishedAt?: string | undefined;
  supersededAt?: string | undefined;
  blocks: ContentBlockResponse[];
}

export interface ContentDocumentResponse {
  id: string;
  purpose: ContentDocumentPurposeContract;
  status: ContentDocumentStatusContract;
  title: string;
  ownerPrincipalId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | undefined;
  archivedAt?: string | undefined;
  currentDraftVersion?: ContentVersionResponse | undefined;
  publishedSnapshotId?: string | undefined;
}
