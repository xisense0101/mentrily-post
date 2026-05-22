import { Button } from '@mentrily/ui-system';
import type { BlockContentKindContract } from '../../types';

interface BlockTypePickerProps {
  onPick: (kind: BlockContentKindContract) => void;
}

const KINDS: Array<{ kind: BlockContentKindContract; label: string }> = [
  { kind: 'PARAGRAPH', label: 'Paragraph' },
  { kind: 'HEADING', label: 'Heading' },
  { kind: 'CODE', label: 'Code' },
  { kind: 'CALLOUT', label: 'Callout' },
  { kind: 'DIVIDER', label: 'Divider' },
  { kind: 'IMAGE', label: 'Image' },
  { kind: 'VIDEO', label: 'Video' },
  { kind: 'FILE', label: 'File' },
];

export function BlockTypePicker({ onPick }: BlockTypePickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {KINDS.map((entry) => (
        <div data-testid={`content-add-${entry.kind.toLowerCase()}-button`} key={entry.kind}>
          <Button onClick={() => onPick(entry.kind)} variant="secondary">
            {entry.label}
          </Button>
        </div>
      ))}
    </div>
  );
}
