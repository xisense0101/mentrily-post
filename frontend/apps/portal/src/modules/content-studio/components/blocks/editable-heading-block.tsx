import { Input } from '@mentrily/ui-system';
import type { ContentBlockContract } from '../../types';

interface EditableHeadingBlockProps {
  block: ContentBlockContract;
  editable: boolean;
  onChange: (content: Record<string, unknown>) => void;
}

export function EditableHeadingBlock({ block, editable, onChange }: EditableHeadingBlockProps) {
  const text = typeof block.content.text === 'string' ? block.content.text : '';
  const isSubheading = block.kind === 'SUBHEADING';

  if (!editable) {
    const Tag = isSubheading ? 'h3' : 'h2';
    return <Tag className="font-semibold text-slate-950">{text || 'Untitled heading'}</Tag>;
  }

  return (
    <Input
      aria-label={isSubheading ? 'Subheading content' : 'Heading content'}
      data-testid="content-block-heading-editor"
      value={text}
      onChange={(event) => onChange({ ...block.content, text: event.target.value })}
      placeholder={isSubheading ? 'Subheading text' : 'Heading text'}
    />
  );
}
