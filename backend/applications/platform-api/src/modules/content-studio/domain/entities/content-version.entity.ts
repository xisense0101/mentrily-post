import { ContentVersionStatus } from '../value-objects/index.js';
import { ContentBlock } from './content-block.entity.js';

export interface ContentVersionProps {
  id: string;
  documentId: string;
  versionNumber: number;
  status: ContentVersionStatus;
  blocks: ContentBlock[];
  createdByPrincipalId: string;
  createdAt: Date;
  publishedAt?: Date;
  supersededAt?: Date;
}

function sortBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return [...blocks].sort((a, b) => {
    const pathCmp = a.path.toString().localeCompare(b.path.toString(), undefined, { numeric: true });
    if (pathCmp !== 0) return pathCmp;
    return a.position - b.position;
  });
}

export class ContentVersion implements ContentVersionProps {
  id: string;
  documentId: string;
  versionNumber: number;
  status: ContentVersionStatus;
  blocks: ContentBlock[];
  createdByPrincipalId: string;
  createdAt: Date;
  publishedAt?: Date;
  supersededAt?: Date;

  constructor(props: ContentVersionProps) {
    if (!props.documentId) throw new Error('documentId required');
    if (!props.createdByPrincipalId) throw new Error('createdByPrincipalId required');
    if (!Number.isInteger(props.versionNumber) || props.versionNumber < 1) {
      throw new Error('versionNumber must be >= 1');
    }
    this.id = props.id;
    this.documentId = props.documentId;
    this.versionNumber = props.versionNumber;
    this.status = props.status;
    this.blocks = sortBlocks(props.blocks);
    this.createdByPrincipalId = props.createdByPrincipalId;
    this.createdAt = props.createdAt;
    if (props.publishedAt !== undefined) {
      this.publishedAt = props.publishedAt;
    }
    if (props.supersededAt !== undefined) {
      this.supersededAt = props.supersededAt;
    }
  }

  static createDraft(input: Omit<ContentVersionProps, 'status' | 'createdAt' | 'publishedAt' | 'supersededAt'>): ContentVersion {
    return new ContentVersion({
      ...input,
      status: ContentVersionStatus.DRAFT,
      createdAt: new Date(),
    });
  }

  replaceBlocks(blocks: ContentBlock[]): void {
    if (this.status !== ContentVersionStatus.DRAFT) {
      throw new Error('only draft versions can be replaced');
    }
    this.blocks = sortBlocks(blocks);
  }

  publishSnapshot(publishedAt: Date = new Date()): void {
    if (this.status !== ContentVersionStatus.DRAFT) {
      throw new Error('publishSnapshot can only happen from DRAFT');
    }
    this.status = ContentVersionStatus.PUBLISHED_SNAPSHOT;
    this.publishedAt = publishedAt;
  }

  markSuperseded(supersededAt: Date = new Date()): void {
    if (this.status !== ContentVersionStatus.PUBLISHED_SNAPSHOT) {
      throw new Error('markSuperseded can only happen from PUBLISHED_SNAPSHOT');
    }
    this.status = ContentVersionStatus.SUPERSEDED;
    this.supersededAt = supersededAt;
  }
}
