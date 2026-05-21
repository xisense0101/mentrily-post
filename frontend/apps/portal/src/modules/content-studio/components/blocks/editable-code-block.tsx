import { Input, Textarea } from '@mentrily/ui-system';
import type { ContentBlockContract } from '../../types';

interface EditableCodeBlockProps {
  block: ContentBlockContract;
  editable: boolean;
  onChange: (content: Record<string, unknown>) => void;
}

export function EditableCodeBlock({ block, editable, onChange }: EditableCodeBlockProps) {
  const code = typeof block.content.code === 'string' ? block.content.code : '';
  const language = typeof block.content.language === 'string' ? block.content.language : 'text';

  if (!editable) {
    return (
      <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100">
        <code>{code || '// Empty code block'}</code>
      </pre>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        aria-label="Code language"
        data-testid="content-block-code-language-editor"
        value={language}
        onChange={(event) =>
          onChange({ ...block.content, language: event.target.value || 'text', code })
        }
        placeholder="Language"
      />
      <Textarea
        aria-label="Code content"
        data-testid="content-block-code-editor"
        value={code}
        onChange={(event) => onChange({ ...block.content, code: event.target.value, language })}
        placeholder="Write code"
      />
    </div>
  );
}
