import type { AssessmentQuestionContract } from '../../types';
import { OptionEditor } from './option-editor';
import { QuestionShell } from './question-shell';

interface EditableTrueFalseQuestionProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
}

export function EditableTrueFalseQuestion({
  question,
  onUpdate,
  onRemove,
  readonly,
}: EditableTrueFalseQuestionProps) {
  const options = (question.options as Array<{
    id: string;
    label: string;
    value: string;
    isCorrect: boolean;
  }>) ?? [
    { id: 'true-opt', label: 'True', value: 'true', isCorrect: false },
    { id: 'false-opt', label: 'False', value: 'false', isCorrect: false },
  ];

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
        <p className="text-xs font-medium text-slate-600">Select the correct answer</p>
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
