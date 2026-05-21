import { ContentDocumentStatus, ContentDocumentPurpose } from '../value-objects/index.js';
import { ContentPublishedSnapshot } from './content-published-snapshot.entity.js';
import { ContentVersion } from './content-version.entity.js';
import { ContentBlock } from './content-block.entity.js';

export interface ContentDocumentProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  ownerPrincipalId: string;
  purpose: ContentDocumentPurpose;
  status: ContentDocumentStatus;
  title: string;
  currentDraftVersion?: ContentVersion;
  publishedSnapshot?: ContentPublishedSnapshot;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

export class ContentDocument implements ContentDocumentProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  ownerPrincipalId: string;
  purpose: ContentDocumentPurpose;
  status: ContentDocumentStatus;
  title: string;
  currentDraftVersion?: ContentVersion;
  publishedSnapshot?: ContentPublishedSnapshot;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;

  constructor(props: ContentDocumentProps) {
    if (!props.tenantId) throw new Error('tenantId required');
    if (!props.workspaceId) throw new Error('workspaceId required');
    if (!props.ownerPrincipalId) throw new Error('ownerPrincipalId required');
    if (!props.title || props.title.trim() === '') throw new Error('title cannot be empty');
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.workspaceId = props.workspaceId;
    this.ownerPrincipalId = props.ownerPrincipalId;
    this.purpose = props.purpose;
    this.status = props.status;
    this.title = props.title;
    if (props.currentDraftVersion !== undefined) {
      this.currentDraftVersion = props.currentDraftVersion;
    }
    if (props.publishedSnapshot !== undefined) {
      this.publishedSnapshot = props.publishedSnapshot;
    }
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    if (props.publishedAt !== undefined) {
      this.publishedAt = props.publishedAt;
    }
    if (props.archivedAt !== undefined) {
      this.archivedAt = props.archivedAt;
    }
  }

  static createDraft(input: Omit<ContentDocumentProps, 'status' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'archivedAt'>): ContentDocument {
    const now = new Date();
    return new ContentDocument({
      ...input,
      status: ContentDocumentStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
    });
  }

  rename(title: string): void {
    this.assertNotArchived();
    if (!title || title.trim() === '') throw new Error('title cannot be empty');
    this.title = title;
    this.updatedAt = new Date();
  }

  replaceDraftBlocks(blocks: ContentBlock[]): void {
    this.assertNotArchived();
    if (!this.currentDraftVersion) throw new Error('document draft version required');
    this.currentDraftVersion.replaceBlocks(blocks);
    this.updatedAt = new Date();
  }

  publish(snapshot: ContentPublishedSnapshot): void {
    this.assertNotArchived();
    if (this.status !== ContentDocumentStatus.DRAFT) throw new Error('only draft document can publish');
    if (!this.currentDraftVersion) throw new Error('document cannot publish without draft version');
    if (this.currentDraftVersion.blocks.length === 0) throw new Error('document cannot publish empty content');
    this.status = ContentDocumentStatus.PUBLISHED;
    this.publishedSnapshot = snapshot;
    this.publishedAt = snapshot.publishedAt;
    this.updatedAt = new Date();
  }

  archive(): void {
    this.status = ContentDocumentStatus.ARCHIVED;
    this.archivedAt = new Date();
    this.updatedAt = new Date();
  }

  restoreToDraft(nextDraftVersion?: ContentVersion): void {
    if (this.status !== ContentDocumentStatus.PUBLISHED && this.status !== ContentDocumentStatus.ARCHIVED) {
      throw new Error('restoreToDraft allowed only from PUBLISHED or ARCHIVED');
    }
    this.status = ContentDocumentStatus.DRAFT;
    delete this.archivedAt;
    delete this.publishedSnapshot;
    delete this.publishedAt;
    if (nextDraftVersion !== undefined) {
      this.currentDraftVersion = nextDraftVersion;
    }
    this.updatedAt = new Date();
  }

  private assertNotArchived(): void {
    if (this.status === ContentDocumentStatus.ARCHIVED) {
      throw new Error('archived document cannot be modified');
    }
  }
}
