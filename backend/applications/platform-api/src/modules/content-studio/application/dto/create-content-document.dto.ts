import type {
  ContentDocumentPurposeContract,
  BlockContentKindContract,
} from '@mentrily/contract-catalog';

export interface ContentBlockInput {
  id: string;
  parentBlockId?: string | undefined;
  kind: BlockContentKindContract;
  position: number;
  path: string;
  content: Record<string, unknown>;
  metadata?: Record<string, unknown> | undefined;
}

export interface CreateContentDocumentInput {
  title: string;
  purpose: ContentDocumentPurposeContract;
  blocks?: ContentBlockInput[] | undefined;
}
