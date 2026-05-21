import type { AssessmentQuestionContract } from '../../types';
import { AnswerKeyEditor } from './answer-key-editor';
import { QuestionShell } from './question-shell';

interface EditableCodeQuestionProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
}

export function EditableCodeQuestion({
  question,
  onUpdate,
  onRemove,
  readonly,
}: EditableCodeQuestionProps) {
  return (
    <QuestionShell onRemove={onRemove} onUpdate={onUpdate} question={question} readonly={readonly}>
      <div className="rounded-xl bg-slate-100 px-3 py-3 text-xs text-slate-600 border border-slate-200">
        <p className="font-semibold text-slate-700">Code question — structural placeholder</p>
        <p className="mt-1 text-slate-500">
          Code execution runtime is not yet connected. This question captures structure and expected
          output description only. Full execution support will be added in a future task.
        </p>
      </div>
      <AnswerKeyEditor
        answerKey={question.answerKey}
        disabled={readonly}
        kind="CODE"
        onChange={(answerKey) => onUpdate?.({ answerKey })}
      />
    </QuestionShell>
  );
}
