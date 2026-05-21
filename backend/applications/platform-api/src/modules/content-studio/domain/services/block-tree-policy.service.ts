import { ContentBlock } from '../entities/index.js';

export class BlockTreePolicyService {
  validateTree(input: { blocks: ContentBlock[] }): { valid: boolean; reason?: string } {
    const { blocks } = input;
    if (blocks.length === 0) return { valid: true };

    const ids = new Set<string>();
    const paths = new Set<string>();
    const byId = new Map<string, ContentBlock>();
    const siblingPositions = new Map<string, Set<number>>();
    let rootCount = 0;

    for (const block of blocks) {
      if (ids.has(block.id)) return { valid: false, reason: 'block IDs must be unique' };
      ids.add(block.id);
      byId.set(block.id, block);

      if (block.parentBlockId === block.id) return { valid: false, reason: 'no block can be its own parent' };
      if (!Number.isInteger(block.position) || block.position < 0) {
        return { valid: false, reason: 'sibling positions must be deterministic and non-negative' };
      }

      const pathKey = block.path.toString();
      if (paths.has(pathKey)) return { valid: false, reason: 'no duplicate path strings allowed' };
      paths.add(pathKey);

      if (block.parentBlockId === undefined) {
        rootCount += 1;
      }

      const siblingKey = block.parentBlockId ?? 'root';
      const positions = siblingPositions.get(siblingKey) ?? new Set<number>();
      if (positions.has(block.position)) {
        return { valid: false, reason: 'sibling positions must be deterministic and non-negative' };
      }
      positions.add(block.position);
      siblingPositions.set(siblingKey, positions);
    }

    for (const block of blocks) {
      const segments = block.path.segments();
      if (block.parentBlockId !== undefined) {
        const parent = byId.get(block.parentBlockId);
        if (!parent) return { valid: false, reason: 'parent IDs must exist when provided' };

        const parentSegments = parent.path.segments();
        if (
          segments.length !== parentSegments.length + 1
          || parentSegments.some((segment, index) => segment !== segments[index])
          || segments[segments.length - 1] !== block.position
        ) {
          return { valid: false, reason: 'no orphan path/parent mismatch if detectable' };
        }
      } else if (segments.length !== 1 || segments[0] !== block.position) {
        return { valid: false, reason: 'no orphan path/parent mismatch if detectable' };
      }
    }

    if (rootCount === 0) return { valid: false, reason: 'at least one root block should exist for non-empty documents' };
    return { valid: true };
  }
}
