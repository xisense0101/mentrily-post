export type ContentDocumentPurposeContract =
  | 'COURSE_CONTENT'
  | 'LESSON_CONTENT'
  | 'ASSESSMENT_CONTENT_RESERVED'
  | 'QUESTION_CONTENT_RESERVED'
  | 'GENERAL_PAGE';

export type ContentDocumentStatusContract =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type ContentVersionStatusContract =
  | 'DRAFT'
  | 'PUBLISHED_SNAPSHOT'
  | 'SUPERSEDED';

export type BlockContentKindContract =
  | 'PARAGRAPH'
  | 'HEADING'
  | 'SUBHEADING'
  | 'BULLET_LIST'
  | 'NUMBERED_LIST'
  | 'QUOTE'
  | 'CALLOUT'
  | 'DIVIDER'
  | 'IMAGE'
  | 'VIDEO'
  | 'EMBED'
  | 'FILE'
  | 'LINK'
  | 'CODE'
  | 'LESSON_REFERENCE'
  | 'SECTION_REFERENCE'
  | 'AI_PROMPT_PLACEHOLDER'
  | 'MCQ_QUESTION'
  | 'MULTI_SELECT_QUESTION'
  | 'CODE_QUESTION'
  | 'READING_PASSAGE'
  | 'RUBRIC'
  | 'GRADING_RULE'
  | 'NOTEBOOK_PROMPT';

export interface ContentBlockContract {
  id: string;
  parentBlockId?: string | undefined;
  kind: BlockContentKindContract;
  position: number;
  path: string;
  content: Record<string, unknown>;
  metadata?: Record<string, unknown> | undefined;
}

export interface ContentVersionContract {
  id: string;
  versionNumber: number;
  status: ContentVersionStatusContract;
  createdByPrincipalId: string;
  createdAt: string;
  publishedAt?: string | undefined;
  supersededAt?: string | undefined;
  blocks: ContentBlockContract[];
}

export interface ContentPublishedSnapshotContract {
  id: string;
  documentId: string;
  versionId: string;
  versionNumber: number;
  publishedByPrincipalId: string;
  publishedAt: string;
  createdAt: string;
  blocks: ContentBlockContract[];
}

export interface ContentDocumentContract {
  id: string;
  purpose: ContentDocumentPurposeContract;
  status: ContentDocumentStatusContract;
  title: string;
  ownerPrincipalId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | undefined;
  archivedAt?: string | undefined;
  currentDraftVersion?: ContentVersionContract | undefined;
  publishedSnapshot?: ContentPublishedSnapshotContract | undefined;
}

export interface CreateContentDocumentRequest {
  title: string;
  purpose: ContentDocumentPurposeContract;
  blocks?: ContentBlockContract[] | undefined;
}

export interface UpdateContentDocumentRequest {
  title?: string | undefined;
}

export interface ReplaceContentBlocksRequest {
  blocks: ContentBlockContract[];
}

export type PublishContentDocumentRequest = Record<string, never>;

export type RestoreContentDocumentRequest = Record<string, never>;
