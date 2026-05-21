import { Textarea } from '@mentrily/ui-system';
import { useId } from 'react';
import type { AssessmentQuestionKindContract, QuestionAnswerKeyContract } from '../../types';

interface AnswerKeyEditorProps {
  kind: AssessmentQuestionKindContract;
  answerKey?: QuestionAnswerKeyContract | undefined;
  onChange: (answerKey?: QuestionAnswerKeyContract | undefined) => void;
  disabled?: boolean | undefined;
}

export function AnswerKeyEditor({ kind, answerKey, onChange, disabled }: AnswerKeyEditorProps) {
  const textareaId = useId();

  if (kind === 'SHORT_ANSWER') {
    const acceptedAnswers = (answerKey?.acceptedTextAnswers ?? []).join('\n');

    return (
      <div className="space-y-1" data-testid="assessment-answer-key-editor">
        <label className="text-xs font-medium text-slate-600" htmlFor={textareaId}>
          Accepted answers (one per line)
        </label>
        <Textarea
          disabled={disabled}
          id={textareaId}
          onChange={(event) => {
            const values = event.target.value
              .split('\n')
              .map((v) => v.trim())
              .filter(Boolean);
            onChange(
              values.length > 0 ? { ...(answerKey ?? {}), acceptedTextAnswers: values } : undefined,
            );
          }}
          placeholder="Enter each accepted answer on a new line"
          rows={3}
          value={acceptedAnswers}
        />
      </div>
    );
  }

  if (kind === 'CODE') {
    return (
      <div className="space-y-1" data-testid="assessment-answer-key-editor">
        <label className="text-xs font-medium text-slate-600" htmlFor={textareaId}>
          Expected output (placeholder — no execution yet)
        </label>
        <Textarea
          disabled={disabled}
          id={textareaId}
          onChange={(event) =>
            onChange(
              event.target.value.trim().length > 0
                ? {
                    ...(answerKey ?? {}),
                    expectedOutput: event.target.value.trim(),
                  }
                : undefined,
            )
          }
          placeholder="Describe expected output or results..."
          rows={3}
          value={answerKey?.expectedOutput ?? ''}
        />
      </div>
    );
  }

  if (kind === 'LONG_ANSWER') {
    const rubricPlaceholder =
      (answerKey?.metadata as { rubricPlaceholder?: string } | undefined)?.rubricPlaceholder ?? '';

    return (
      <div className="space-y-1" data-testid="assessment-answer-key-editor">
        <label className="text-xs font-medium text-slate-600" htmlFor={textareaId}>
          Rubric / grading notes (placeholder)
        </label>
        <Textarea
          disabled={disabled}
          id={textareaId}
          onChange={(event) =>
            onChange(
              event.target.value.trim().length > 0
                ? {
                    ...(answerKey ?? {}),
                    metadata: {
                      ...(answerKey?.metadata ?? {}),
                      rubricPlaceholder: event.target.value.trim(),
                    },
                  }
                : undefined,
            )
          }
          placeholder="Describe grading criteria or rubric..."
          rows={3}
          value={rubricPlaceholder}
        />
      </div>
    );
  }

  return null;
}
