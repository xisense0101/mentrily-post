import type { AssessmentQuestionContract } from '../../types';
import { AnswerKeyEditor } from './answer-key-editor';
import { QuestionShell } from './question-shell';

interface EditableLongAnswerQuestionProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
}

export function EditableLongAnswerQuestion({
  question,
  onUpdate,
  onRemove,
  readonly,
}: EditableLongAnswerQuestionProps) {
  return (
    <QuestionShell onRemove={onRemove} onUpdate={onUpdate} question={question} readonly={readonly}>
      <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 border border-amber-200">
        Long answer questions use manual grading. Rubric guidance can be added below.
      </div>
      <AnswerKeyEditor
        answerKey={question.answerKey}
        disabled={readonly}
        kind="LONG_ANSWER"
        onChange={(answerKey) => onUpdate?.({ answerKey })}
      />
    </QuestionShell>
  );
}
