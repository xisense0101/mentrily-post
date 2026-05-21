import type { AssessmentContract } from '../../types';
import { AssessmentPurposeBadge } from '../assessments/assessment-purpose-badge';
import { AssessmentStatusBadge } from '../assessments/assessment-status-badge';

interface AssessmentEditorHeaderProps {
  assessment: AssessmentContract;
  onRename?: ((title: string) => void) | undefined;
  isRenaming?: boolean | undefined;
  readonly?: boolean | undefined;
}

export function AssessmentEditorHeader({
  assessment,
  onRename,
  isRenaming,
  readonly,
}: AssessmentEditorHeaderProps) {
  return (
    <div
      className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"
      data-testid="assessment-editor-header"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div data-testid="assessment-editor-status-badge">
            <AssessmentStatusBadge status={assessment.status} />
          </div>
          <AssessmentPurposeBadge purpose={assessment.purpose} />
        </div>
        <h1
          className="mt-2 text-2xl font-semibold text-slate-950"
          data-testid="assessment-editor-title"
        >
          {assessment.title}
        </h1>
        {assessment.description ? (
          <p className="mt-1 text-sm text-slate-500">{assessment.description}</p>
        ) : null}
      </div>

      {onRename && !readonly ? (
        <button
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          disabled={isRenaming}
          onClick={() => {
            const newTitle = window.prompt('New assessment title:', assessment.title);
            if (newTitle?.trim()) {
              onRename(newTitle.trim());
            }
          }}
          type="button"
        >
          {isRenaming ? 'Renaming...' : 'Rename'}
        </button>
      ) : null}
    </div>
  );
}
