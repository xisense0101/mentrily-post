import type { AssessmentQuestionContract } from '../../types';
import { QuestionRenderer } from './question-renderer';

interface QuestionListProps {
  questions: AssessmentQuestionContract[];
  onUpdateQuestion?:
    | ((questionId: string, patch: Partial<AssessmentQuestionContract>) => void)
    | undefined;
  onRemoveQuestion?: ((questionId: string) => void) | undefined;
  readonly?: boolean | undefined;
}

export function QuestionList({
  questions,
  onUpdateQuestion,
  onRemoveQuestion,
  readonly,
}: QuestionListProps) {
  if (questions.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center"
        data-testid="question-list-empty"
      >
        <p className="text-sm text-slate-500">No questions yet. Add one below.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3" data-testid="assessment-question-list">
      {questions.map((question) => (
        <QuestionRenderer
          key={question.id}
          onRemove={onRemoveQuestion ? () => onRemoveQuestion(question.id) : undefined}
          onUpdate={onUpdateQuestion ? (patch) => onUpdateQuestion(question.id, patch) : undefined}
          question={question}
          readonly={readonly}
        />
      ))}
    </div>
  );
}
