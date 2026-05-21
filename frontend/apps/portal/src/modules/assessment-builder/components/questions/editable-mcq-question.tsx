import type { AssessmentQuestionContract } from '../../types';
import { OptionEditor } from './option-editor';
import { QuestionShell } from './question-shell';

interface EditableMcqQuestionProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
}

export function EditableMcqQuestion({
  question,
  onUpdate,
  onRemove,
  readonly,
}: EditableMcqQuestionProps) {
  const options =
    (question.options as Array<{
      id: string;
      label: string;
      value: string;
      isCorrect: boolean;
    }>) ?? [];

  function handleOptionsChange(
    nextOptions: Array<{ id: string; label: string; value: string; isCorrect: boolean }>,
  ) {
    const correctOptionIds = nextOptions.filter((o) => o.isCorrect).map((o) => o.id);
    onUpdate?.({
      options: nextOptions,
      answerKey: correctOptionIds.length > 0 ? { correctOptionIds } : undefined,
    });
  }

  return (
    <QuestionShell onRemove={onRemove} onUpdate={onUpdate} question={question} readonly={readonly}>
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600">Options (select the correct answer)</p>
        <OptionEditor
          disabled={readonly}
          multipleCorrect={false}
          onChange={handleOptionsChange}
          options={options}
        />
      </div>
    </QuestionShell>
  );
}
