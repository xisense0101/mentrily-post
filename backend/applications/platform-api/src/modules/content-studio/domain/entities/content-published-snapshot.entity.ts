import { ContentVersionStatus } from '../value-objects/index.js';
import { ContentBlock } from './content-block.entity.js';
import { ContentVersion } from './content-version.entity.js';

export interface ContentPublishedSnapshotProps {
  id: string;
  documentId: string;
  versionId: string;
  versionNumber: number;
  blocks: ContentBlock[];
  publishedByPrincipalId: string;
  publishedAt: Date;
  createdAt: Date;
}

function cloneBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((block) => new ContentBlock({
    id: block.id,
    documentId: block.documentId,
    ...(block.parentBlockId !== undefined ? { parentBlockId: block.parentBlockId } : {}),
    kind: block.kind,
    position: block.position,
    path: block.path,
    content: { ...block.content },
    metadata: { ...block.metadata },
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  }));
}

export class ContentPublishedSnapshot implements ContentPublishedSnapshotProps {
  readonly id: string;
  readonly documentId: string;
  readonly versionId: string;
  readonly versionNumber: number;
  readonly blocks: ContentBlock[];
  readonly publishedByPrincipalId: string;
  readonly publishedAt: Date;
  readonly createdAt: Date;

  constructor(props: ContentPublishedSnapshotProps) {
    if (!props.publishedByPrincipalId) throw new Error('publishedByPrincipalId required');
    this.id = props.id;
    this.documentId = props.documentId;
    this.versionId = props.versionId;
    this.versionNumber = props.versionNumber;
    this.blocks = cloneBlocks(props.blocks);
    this.publishedByPrincipalId = props.publishedByPrincipalId;
    this.publishedAt = props.publishedAt;
    this.createdAt = props.createdAt;
  }

  static createFromVersion(input: {
    id: string;
    version: ContentVersion;
    publishedByPrincipalId: string;
    publishedAt?: Date;
  }): ContentPublishedSnapshot {
    if (input.version.status !== ContentVersionStatus.PUBLISHED_SNAPSHOT) {
      throw new Error('source version must be PUBLISHED_SNAPSHOT');
    }
    const publishedAt = input.publishedAt ?? input.version.publishedAt ?? new Date();
    return new ContentPublishedSnapshot({
      id: input.id,
      documentId: input.version.documentId,
      versionId: input.version.id,
      versionNumber: input.version.versionNumber,
      blocks: input.version.blocks,
      publishedByPrincipalId: input.publishedByPrincipalId,
      publishedAt,
      createdAt: new Date(),
    });
  }
}
