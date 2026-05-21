import { Input, Textarea } from '@mentrily/ui-system';
import { useId } from 'react';
import type { AssessmentQuestionContract } from '../../types';
import { QuestionShell } from './question-shell';

interface EditableReadingPassageQuestionProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
}

function readField(value: unknown, key: string): string {
  if (typeof value !== 'object' || value === null) {
    return '';
  }

  const record = value as Record<string, unknown>;
  return typeof record[key] === 'string' ? record[key] : '';
}

export function EditableReadingPassageQuestion({
  question,
  onUpdate,
  onRemove,
  readonly,
}: EditableReadingPassageQuestionProps) {
  const titleId = useId();
  const sourceId = useId();
  const bodyId = useId();
  const passageTitle = readField(question.prompt, 'passageTitle');
  const passageBody = readField(question.prompt, 'passageBody');
  const sourceLabel = readField(question.prompt, 'sourceLabel');

  return (
    <QuestionShell onRemove={onRemove} onUpdate={onUpdate} question={question} readonly={readonly}>
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <p className="font-semibold">Reading passage context block</p>
        <p className="mt-1 text-sky-800">
          This item provides shared reading context. It has no answer key, defaults to zero points,
          and is not auto-graded.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600" htmlFor={titleId}>
            Passage title
          </label>
          <Input
            disabled={readonly}
            id={titleId}
            onChange={(event) =>
              onUpdate?.({
                prompt: {
                  ...question.prompt,
                  passageTitle: event.target.value,
                },
                answerKey: undefined,
                gradingMode: 'MANUAL',
                points: 0,
              })
            }
            placeholder="Optional heading for the passage"
            value={passageTitle}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600" htmlFor={sourceId}>
            Source label
          </label>
          <Input
            disabled={readonly}
            id={sourceId}
            onChange={(event) =>
              onUpdate?.({
                prompt: {
                  ...question.prompt,
                  sourceLabel: event.target.value,
                },
                answerKey: undefined,
                gradingMode: 'MANUAL',
                points: 0,
              })
            }
            placeholder="Optional source or attribution"
            value={sourceLabel}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600" htmlFor={bodyId}>
            Passage body
          </label>
          <Textarea
            disabled={readonly}
            id={bodyId}
            onChange={(event) =>
              onUpdate?.({
                prompt: {
                  ...question.prompt,
                  passageBody: event.target.value,
                },
                answerKey: undefined,
                gradingMode: 'MANUAL',
                points: 0,
              })
            }
            placeholder="Paste or write the passage learners should read"
            rows={8}
            value={passageBody}
          />
        </div>
      </div>
    </QuestionShell>
  );
}
