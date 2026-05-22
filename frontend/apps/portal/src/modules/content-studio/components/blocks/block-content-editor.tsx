import type { ContentBlockContract } from '../../types';
import { EditableCalloutBlock } from './editable-callout-block';
import { EditableCodeBlock } from './editable-code-block';
import { EditableHeadingBlock } from './editable-heading-block';
import { EditableParagraphBlock } from './editable-paragraph-block';

import { EditableMediaBlock } from './editable-media-block';

interface BlockContentEditorProps {
  block: ContentBlockContract;
  editable: boolean;
  onChange: (content: Record<string, unknown>) => void;
}

function renderPlaceholder(kind: string) {
  const isReservedAssessment = [
    'MCQ_QUESTION',
    'MULTI_SELECT_QUESTION',
    'CODE_QUESTION',
    'READING_PASSAGE',
    'RUBRIC',
    'GRADING_RULE',
    'NOTEBOOK_PROMPT',
  ].includes(kind);

  return (
    <div
      className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"
      data-testid={isReservedAssessment ? 'reserved-assessment-placeholder' : 'block-placeholder'}
    >
      {isReservedAssessment
        ? `${kind} is reserved for future assessment builder behavior.`
        : `${kind} is not editable in the 009C authoring shell yet.`}
    </div>
  );
}

export function BlockContentEditor({
  block,
  editable,
  onChange,
}: BlockContentEditorProps) {
  if (block.kind === 'PARAGRAPH' || block.kind === 'QUOTE') {
    return <EditableParagraphBlock block={block} editable={editable} onChange={onChange} />;
  }

  if (block.kind === 'HEADING' || block.kind === 'SUBHEADING') {
    return <EditableHeadingBlock block={block} editable={editable} onChange={onChange} />;
  }

  if (block.kind === 'CALLOUT') {
    return <EditableCalloutBlock block={block} editable={editable} onChange={onChange} />;
  }

  if (block.kind === 'CODE') {
    return <EditableCodeBlock block={block} editable={editable} onChange={onChange} />;
  }

  if (block.kind === 'IMAGE' || block.kind === 'VIDEO' || block.kind === 'FILE') {
    return <EditableMediaBlock block={block} editable={editable} onChange={onChange} />;
  }

  if (block.kind === 'DIVIDER') {
    return <hr className="border-slate-300" />;
  }

  return renderPlaceholder(block.kind);
}
