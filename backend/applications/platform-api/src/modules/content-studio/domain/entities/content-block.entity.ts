import { BlockContentKind, BlockId, BlockTreePath } from '../value-objects/index.js';

export interface ContentBlockProps {
  id: string;
  documentId: string;
  parentBlockId?: string;
  kind: BlockContentKind;
  position: number;
  path: BlockTreePath;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

function assertRecord(value: unknown, fieldName: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be object-like`);
  }
}

export class ContentBlock implements ContentBlockProps {
  id: string;
  documentId: string;
  parentBlockId?: string;
  kind: BlockContentKind;
  position: number;
  path: BlockTreePath;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: ContentBlockProps) {
    const blockId = new BlockId(props.id);
    if (!props.documentId) throw new Error('document id cannot be empty');
    if (props.parentBlockId === blockId.toString()) throw new Error('parentBlockId cannot equal block id');
    if (!Number.isInteger(props.position) || props.position < 0) throw new Error('position must be >= 0');
    assertRecord(props.content, 'content');
    assertRecord(props.metadata, 'metadata');

    this.id = blockId.toString();
    this.documentId = props.documentId;
    if (props.parentBlockId !== undefined) {
      this.parentBlockId = props.parentBlockId;
    }
    this.kind = props.kind;
    this.position = props.position;
    this.path = props.path;
    this.content = { ...props.content };
    this.metadata = { ...props.metadata };
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(input: Omit<ContentBlockProps, 'createdAt' | 'updatedAt'>): ContentBlock {
    const now = new Date();
    return new ContentBlock({
      ...input,
      createdAt: now,
      updatedAt: now,
    });
  }

  updateContent(content: Record<string, unknown>): void {
    assertRecord(content, 'content');
    this.content = { ...content };
    this.updatedAt = new Date();
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    assertRecord(metadata, 'metadata');
    this.metadata = { ...metadata };
    this.updatedAt = new Date();
  }

  moveTo(input: { position: number; path: BlockTreePath }): void {
    if (!Number.isInteger(input.position) || input.position < 0) {
      throw new Error('position must be >= 0');
    }
    this.position = input.position;
    this.path = input.path;
    this.updatedAt = new Date();
  }

  attachToParent(parentBlockId: string): void {
    if (!parentBlockId) throw new Error('parentBlockId cannot be empty');
    if (parentBlockId === this.id) throw new Error('parentBlockId cannot equal block id');
    this.parentBlockId = parentBlockId;
    this.updatedAt = new Date();
  }

  detachFromParent(): void {
    delete this.parentBlockId;
    this.updatedAt = new Date();
  }
}
