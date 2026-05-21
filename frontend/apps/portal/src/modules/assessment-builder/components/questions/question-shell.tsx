import { Input, Textarea } from '@mentrily/ui-system';
import { useId } from 'react';
import type { AssessmentQuestionContract } from '../../types';
import { GradingModePicker } from './grading-mode-picker';
import { QuestionKindBadge } from './question-kind-badge';

interface QuestionShellProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
  children?: React.ReactNode | undefined;
}

export function QuestionShell({
  question,
  onUpdate,
  onRemove,
  readonly = false,
  children,
}: QuestionShellProps) {
  const titleId = useId();
  const promptId = useId();

  const prompt = (question.prompt as { text?: string }).text ?? '';

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
      data-testid="assessment-question-shell"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <QuestionKindBadge kind={question.kind} />
        {onRemove && !readonly ? (
          <button
            aria-label="Remove question"
            className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            onClick={onRemove}
            type="button"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="space-y-1" data-testid="assessment-question-title-input">
          <label className="text-xs font-medium text-slate-600" htmlFor={titleId}>
            Question title
          </label>
          <Input
            disabled={readonly}
            id={titleId}
            onChange={(event) => onUpdate?.({ title: event.target.value })}
            placeholder="Enter question title..."
            value={question.title}
          />
        </div>

        <div className="space-y-1" data-testid="assessment-question-prompt-input">
          <label className="text-xs font-medium text-slate-600" htmlFor={promptId}>
            Prompt / stem
          </label>
          <Textarea
            disabled={readonly}
            id={promptId}
            onChange={(event) => onUpdate?.({ prompt: { text: event.target.value } })}
            placeholder="Describe the question..."
            rows={2}
            value={prompt}
          />
        </div>

        {children}

        <div className="flex items-center gap-4 pt-1">
          <div className="space-y-1" data-testid="assessment-question-points-input">
            <label className="text-xs font-medium text-slate-600">Points</label>
            <input
              className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-50"
              disabled={readonly}
              min={0}
              onChange={(event) => onUpdate?.({ points: Number(event.target.value) })}
              type="number"
              value={question.points}
            />
          </div>

          <GradingModePicker
            disabled={readonly}
            onChange={(gradingMode) => onUpdate?.({ gradingMode })}
            value={question.gradingMode}
          />
        </div>
      </div>
    </div>
  );
}
