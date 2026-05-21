import { Textarea } from '@mentrily/ui-system';
import type { ContentBlockContract } from '../../types';

interface EditableParagraphBlockProps {
  block: ContentBlockContract;
  editable: boolean;
  onChange: (content: Record<string, unknown>) => void;
}

export function EditableParagraphBlock({ block, editable, onChange }: EditableParagraphBlockProps) {
  const text = typeof block.content.text === 'string' ? block.content.text : '';

  if (!editable) {
    return (
      <p className="whitespace-pre-wrap text-sm text-slate-700">{text || 'Empty paragraph'}</p>
    );
  }

  return (
    <Textarea
      aria-label="Paragraph content"
      data-testid="content-block-paragraph-editor"
      value={text}
      onChange={(event) => onChange({ ...block.content, text: event.target.value })}
      placeholder="Write paragraph text"
    />
  );
}
