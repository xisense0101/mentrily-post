import { Button, Card } from '@mentrily/ui-system';
import type { ReactNode } from 'react';
import type { ContentBlockContract } from '../../types';

interface BlockShellProps {
  block: ContentBlockContract;
  children: ReactNode;
  editable: boolean;
  onRemove?: (blockId: string) => void;
}

export function BlockShell({ block, children, editable, onRemove }: BlockShellProps) {
  return (
    <Card
      className="space-y-3 rounded-[1.75rem] border-slate-200/90 bg-white transition hover:border-slate-300"
      data-testid="content-block-shell"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {block.kind}
          </p>
          <p className="text-xs text-slate-500">Path {block.path}</p>
        </div>
        {editable && onRemove ? (
          <Button onClick={() => onRemove(block.id)} variant="ghost">
            Remove
          </Button>
        ) : null}
      </div>
      {children}
    </Card>
  );
}
