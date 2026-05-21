import type { ContentBlockContract } from '../../types';
import { BlockContentEditor } from './block-content-editor';
import { BlockShell } from './block-shell';

interface BlockRendererProps {
  block: ContentBlockContract;
  editable?: boolean;
  onChange?: (blockId: string, content: Record<string, unknown>) => void;
  onRemove?: (blockId: string) => void;
}

export function BlockRenderer({
  block,
  editable = false,
  onChange,
  onRemove,
}: BlockRendererProps) {
  return (
    <BlockShell
      block={block}
      editable={editable}
      {...(onRemove ? { onRemove } : {})}
    >
      <BlockContentEditor
        block={block}
        editable={editable}
        onChange={(content) => onChange?.(block.id, content)}
      />
    </BlockShell>
  );
}
