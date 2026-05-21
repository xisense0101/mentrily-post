import type { AssessmentManualReviewItemContract } from '../../types';

export function QuestionContextPanel({ item }: { item: AssessmentManualReviewItemContract }) {
  return (
    <div
      className="rounded-2xl border border-portal-border bg-white/70 p-4"
      data-testid="question-context-panel"
    >
      <p className="text-sm font-semibold">{item.questionTitle ?? item.questionKind}</p>
      <p className="mt-2 text-sm text-portal-text-muted">
        {String(item.questionPrompt?.text ?? '')}
      </p>
    </div>
  );
}
