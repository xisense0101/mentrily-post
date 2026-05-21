import type { AssessmentQuestionContract } from '../../types';
import { AnswerKeyEditor } from './answer-key-editor';
import { QuestionShell } from './question-shell';

interface EditableShortAnswerQuestionProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
}

export function EditableShortAnswerQuestion({
  question,
  onUpdate,
  onRemove,
  readonly,
}: EditableShortAnswerQuestionProps) {
  return (
    <QuestionShell onRemove={onRemove} onUpdate={onUpdate} question={question} readonly={readonly}>
      <AnswerKeyEditor
        answerKey={question.answerKey}
        disabled={readonly}
        kind="SHORT_ANSWER"
        onChange={(answerKey) => onUpdate?.({ answerKey })}
      />
    </QuestionShell>
  );
}
