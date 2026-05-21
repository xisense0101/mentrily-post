import { Card } from '@mentrily/ui-system';
import type { BlockContentKindContract } from '../../types';
import { BlockTypePicker } from './block-type-picker';

interface BlockCreateToolbarProps {
  onAddBlock: (kind: BlockContentKindContract) => void;
}

export function BlockCreateToolbar({ onAddBlock }: BlockCreateToolbarProps) {
  return (
    <Card className="rounded-[1.75rem]" data-testid="content-block-create-toolbar">
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Add blocks</h3>
          <p className="text-sm text-slate-600">
            Insert basic draft blocks. Drag-and-drop and slash commands are intentionally out of
            scope for 009C.
          </p>
        </div>
        <BlockTypePicker onPick={onAddBlock} />
      </div>
    </Card>
  );
}
