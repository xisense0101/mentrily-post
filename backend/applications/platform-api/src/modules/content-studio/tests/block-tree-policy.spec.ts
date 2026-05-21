import { describe, expect, it } from 'vitest';
import { ContentBlock } from '../domain/entities/content-block.entity.js';
import { BlockTreePolicyService } from '../domain/services/block-tree-policy.service.js';
import { BlockContentKind, BlockTreePath } from '../domain/value-objects/index.js';

function mkBlock(input: {
  id: string;
  position: number;
  path: number[];
  parentBlockId?: string;
}): ContentBlock {
  return ContentBlock.create({
    id: input.id,
    documentId: 'doc-1',
    ...(input.parentBlockId !== undefined ? { parentBlockId: input.parentBlockId } : {}),
    kind: BlockContentKind.PARAGRAPH,
    position: input.position,
    path: new BlockTreePath(input.path),
    content: {},
    metadata: {},
  });
}

describe('BlockTreePolicyService', () => {
  const service = new BlockTreePolicyService();

  it('valid flat block tree passes', () => {
    const result = service.validateTree({
      blocks: [
        mkBlock({ id: 'a', position: 0, path: [0] }),
        mkBlock({ id: 'b', position: 1, path: [1] }),
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('valid nested block tree passes', () => {
    const result = service.validateTree({
      blocks: [
        mkBlock({ id: 'a', position: 0, path: [0] }),
        mkBlock({ id: 'b', position: 0, path: [0, 0], parentBlockId: 'a' }),
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('duplicate block IDs fail', () => {
    const duplicate = mkBlock({ id: 'a', position: 1, path: [1] });
    const result = service.validateTree({
      blocks: [mkBlock({ id: 'a', position: 0, path: [0] }), duplicate],
    });
    expect(result.valid).toBe(false);
  });

  it('self-parent block fails', () => {
    expect(() => mkBlock({ id: 'a', position: 0, path: [0], parentBlockId: 'a' })).toThrow(
      'parentBlockId cannot equal block id',
    );
  });

  it('missing parent fails', () => {
    const result = service.validateTree({
      blocks: [mkBlock({ id: 'a', position: 0, path: [0, 0], parentBlockId: 'missing' })],
    });
    expect(result.valid).toBe(false);
  });

  it('duplicate path fails', () => {
    const result = service.validateTree({
      blocks: [
        mkBlock({ id: 'a', position: 0, path: [0] }),
        mkBlock({ id: 'b', position: 1, path: [0] }),
      ],
    });
    expect(result.valid).toBe(false);
  });

  it('negative positions fail', () => {
    expect(() => mkBlock({ id: 'a', position: -1, path: [0] })).toThrow('position must be >= 0');
  });

  it('empty block array fails only when publishing, not necessarily at tree validation level', () => {
    const result = service.validateTree({ blocks: [] });
    expect(result).toEqual({ valid: true });
  });
});
