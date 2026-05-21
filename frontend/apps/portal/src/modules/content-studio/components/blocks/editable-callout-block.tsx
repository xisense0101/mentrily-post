import { Textarea } from '@mentrily/ui-system';
import type { ContentBlockContract } from '../../types';

interface EditableCalloutBlockProps {
  block: ContentBlockContract;
  editable: boolean;
  onChange: (content: Record<string, unknown>) => void;
}

export function EditableCalloutBlock({ block, editable, onChange }: EditableCalloutBlockProps) {
  const text = typeof block.content.text === 'string' ? block.content.text : '';

  if (!editable) {
    return <p className="whitespace-pre-wrap text-sm text-amber-950">{text || 'Empty callout'}</p>;
  }

  return (
    <Textarea
      aria-label="Callout content"
      data-testid="content-block-callout-editor"
      value={text}
      onChange={(event) => onChange({ ...block.content, text: event.target.value })}
      placeholder="Write callout text"
    />
  );
}
