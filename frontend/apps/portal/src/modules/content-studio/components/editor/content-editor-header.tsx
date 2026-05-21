import { Input } from '@mentrily/ui-system';
import type { ContentDocumentContract } from '../../types';

interface ContentEditorHeaderProps {
  document: ContentDocumentContract;
  isPending?: boolean;
  onRename: (title: string) => void;
}

export function ContentEditorHeader({
  document,
  isPending = false,
  onRename,
}: ContentEditorHeaderProps) {
  return (
    <div className="rounded-[2rem] border border-portal-border bg-white/90 p-6 shadow-portal-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        Content Studio editor
      </p>
      <div className="mt-3 space-y-3">
        <div data-testid="content-editor-title">
          <Input
            aria-label="Document title"
            className="border-none bg-transparent px-0 text-3xl font-semibold shadow-none focus:bg-white focus:px-3.5"
            data-testid="content-editor-rename-input"
            disabled={isPending}
            value={document.title}
            onChange={(event) => onRename(event.target.value)}
          />
        </div>
        <p className="text-sm text-slate-600">
          Purpose {document.purpose}. Status {document.status}.
        </p>
      </div>
    </div>
  );
}
