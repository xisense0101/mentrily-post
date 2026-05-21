import { EmptyState } from '@mentrily/ui-system';
import type { ContentBlockContract } from '../../types';
import { BlockRenderer } from './block-renderer';

interface BlockListProps {
  blocks: ContentBlockContract[];
  editable?: boolean;
  onChange?: (blockId: string, content: Record<string, unknown>) => void;
  onRemove?: (blockId: string) => void;
}

export function BlockList({ blocks, editable = false, onChange, onRemove }: BlockListProps) {
  const sortedBlocks = [...blocks].sort(
    (left, right) => left.position - right.position || left.path.localeCompare(right.path),
  );

  if (sortedBlocks.length === 0) {
    return (
      <div data-testid="content-block-empty-state">
        <EmptyState
          className="min-h-[18rem] content-center bg-white"
          title="No blocks yet"
          description="Add the first block to begin authoring this draft document."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="content-block-list">
      {sortedBlocks.map((block) => (
        <BlockRenderer
          block={block}
          editable={editable}
          key={block.id}
          {...(onChange ? { onChange } : {})}
          {...(onRemove ? { onRemove } : {})}
        />
      ))}
    </div>
  );
}
