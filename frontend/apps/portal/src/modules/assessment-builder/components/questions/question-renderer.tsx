import type { AssessmentQuestionContract } from '../../types';
import { EditableCodeQuestion } from './editable-code-question';
import { EditableFileUploadQuestion } from './editable-file-upload-question';
import { EditableLongAnswerQuestion } from './editable-long-answer-question';
import { EditableMcqQuestion } from './editable-mcq-question';
import { EditableMultiSelectQuestion } from './editable-multi-select-question';
import { EditableReadingPassageQuestion } from './editable-reading-passage-question';
import { EditableShortAnswerQuestion } from './editable-short-answer-question';
import { EditableTrueFalseQuestion } from './editable-true-false-question';
import { QuestionShell } from './question-shell';

interface QuestionRendererProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
}

export function QuestionRenderer({
  question,
  onUpdate,
  onRemove,
  readonly,
}: QuestionRendererProps) {
  const sharedProps = { question, onUpdate, onRemove, readonly };

  if (question.kind === 'MCQ') {
    return <EditableMcqQuestion {...sharedProps} />;
  }

  if (question.kind === 'MULTI_SELECT') {
    return <EditableMultiSelectQuestion {...sharedProps} />;
  }

  if (question.kind === 'TRUE_FALSE') {
    return <EditableTrueFalseQuestion {...sharedProps} />;
  }

  if (question.kind === 'SHORT_ANSWER') {
    return <EditableShortAnswerQuestion {...sharedProps} />;
  }

  if (question.kind === 'LONG_ANSWER') {
    return <EditableLongAnswerQuestion {...sharedProps} />;
  }

  if (question.kind === 'CODE') {
    return <EditableCodeQuestion {...sharedProps} />;
  }

  if (question.kind === 'READING_PASSAGE') {
    return <EditableReadingPassageQuestion {...sharedProps} />;
  }

  if (question.kind === 'FILE_UPLOAD') {
    return <EditableFileUploadQuestion {...sharedProps} />;
  }

  return (
    <QuestionShell onRemove={onRemove} question={question} readonly={true}>
      <div
        className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500 border border-dashed border-slate-200"
        data-testid="question-placeholder"
      >
        <p className="font-semibold">{question.kind} is not supported in this builder yet</p>
        <p className="mt-1">
          The assessment stays editable, but this question kind falls back to a safe read-only
          placeholder until dedicated support is added.
        </p>
      </div>
    </QuestionShell>
  );
}
