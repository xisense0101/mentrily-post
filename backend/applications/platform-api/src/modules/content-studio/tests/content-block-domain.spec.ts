import { describe, expect, it } from 'vitest';
import { ContentBlock } from '../domain/entities/content-block.entity.js';
import { BlockContentKind, BlockTreePath } from '../domain/value-objects/index.js';

describe('ContentBlock domain', () => {
  it('block can be created with valid data', () => {
    const block = ContentBlock.create({
      id: 'block-1',
      documentId: 'doc-1',
      kind: BlockContentKind.PARAGRAPH,
      position: 0,
      path: new BlockTreePath([0]),
      content: { text: 'hello' },
      metadata: { tone: 'plain' },
    });
    expect(block.id).toBe('block-1');
  });

  it('empty block ID is rejected', () => {
    expect(() =>
      ContentBlock.create({
        id: '',
        documentId: 'doc-1',
        kind: BlockContentKind.PARAGRAPH,
        position: 0,
        path: new BlockTreePath([0]),
        content: {},
        metadata: {},
      }),
    ).toThrow('block id cannot be empty');
  });

  it('empty document ID is rejected', () => {
    expect(() =>
      ContentBlock.create({
        id: 'block-1',
        documentId: '',
        kind: BlockContentKind.PARAGRAPH,
        position: 0,
        path: new BlockTreePath([0]),
        content: {},
        metadata: {},
      }),
    ).toThrow('document id cannot be empty');
  });

  it('negative position is rejected', () => {
    expect(() =>
      ContentBlock.create({
        id: 'block-1',
        documentId: 'doc-1',
        kind: BlockContentKind.PARAGRAPH,
        position: -1,
        path: new BlockTreePath([0]),
        content: {},
        metadata: {},
      }),
    ).toThrow('position must be >= 0');
  });

  it('parentBlockId cannot equal block ID', () => {
    expect(() =>
      ContentBlock.create({
        id: 'block-1',
        documentId: 'doc-1',
        parentBlockId: 'block-1',
        kind: BlockContentKind.PARAGRAPH,
        position: 0,
        path: new BlockTreePath([0]),
        content: {},
        metadata: {},
      }),
    ).toThrow('parentBlockId cannot equal block id');
  });

  it('content can be updated', () => {
    const block = ContentBlock.create({
      id: 'block-1',
      documentId: 'doc-1',
      kind: BlockContentKind.PARAGRAPH,
      position: 0,
      path: new BlockTreePath([0]),
      content: { text: 'old' },
      metadata: {},
    });
    block.updateContent({ text: 'new' });
    expect(block.content).toEqual({ text: 'new' });
  });

  it('metadata can be updated', () => {
    const block = ContentBlock.create({
      id: 'block-1',
      documentId: 'doc-1',
      kind: BlockContentKind.PARAGRAPH,
      position: 0,
      path: new BlockTreePath([0]),
      content: {},
      metadata: { old: true },
    });
    block.updateMetadata({ fresh: true });
    expect(block.metadata).toEqual({ fresh: true });
  });

  it('block can move to new path and position', () => {
    const block = ContentBlock.create({
      id: 'block-1',
      documentId: 'doc-1',
      kind: BlockContentKind.PARAGRAPH,
      position: 0,
      path: new BlockTreePath([0]),
      content: {},
      metadata: {},
    });
    block.moveTo({ position: 2, path: new BlockTreePath([1, 2]) });
    expect(block.position).toBe(2);
    expect(block.path.toString()).toBe('1.2');
  });

  it('block can attach to parent', () => {
    const block = ContentBlock.create({
      id: 'block-1',
      documentId: 'doc-1',
      kind: BlockContentKind.PARAGRAPH,
      position: 0,
      path: new BlockTreePath([0]),
      content: {},
      metadata: {},
    });
    block.attachToParent('parent-1');
    expect(block.parentBlockId).toBe('parent-1');
  });

  it('block can detach from parent using optional-property-safe behavior', () => {
    const block = ContentBlock.create({
      id: 'block-1',
      documentId: 'doc-1',
      parentBlockId: 'parent-1',
      kind: BlockContentKind.PARAGRAPH,
      position: 0,
      path: new BlockTreePath([0]),
      content: {},
      metadata: {},
    });
    block.detachFromParent();
    expect('parentBlockId' in block).toBe(false);
  });
});
