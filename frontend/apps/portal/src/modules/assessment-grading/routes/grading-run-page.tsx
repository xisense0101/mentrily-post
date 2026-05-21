'use client';

import { useMemo } from 'react';
import { AnswerReviewPanel, GradingRunSummary, ManualGradeForm, QuestionContextPanel } from '../components/review';
import { GradingErrorState, GradingPageHeader } from '../components/shared';
import { useGradingRun, useManualReviewQueue } from '../hooks';

export function GradingRunPage({ gradingRunId }: { gradingRunId: string }) {
  const { gradingRun, loading, submitting, error, refresh, manualGradeAnswer } = useGradingRun(gradingRunId);
  const queue = useManualReviewQueue();

  const pendingItems = useMemo(
    () => queue.items.filter((item) => item.gradingRunId === gradingRunId),
    [gradingRunId, queue.items],
  );

  return (
    <div className="portal-page space-y-6" data-testid="grading-run-page">
      <GradingPageHeader title="Grading run review" description="Review pending manual answers and complete grading." />
      {loading ? <div>Loading grading run...</div> : null}
      {!loading && error ? <GradingErrorState message={error} onRetry={() => void refresh()} /> : null}
      {!loading && !error && gradingRun ? (
        <>
          <GradingRunSummary run={gradingRun} />
          <section className="rounded-3xl border border-portal-border bg-white p-5">
            <h3 className="text-base font-semibold text-portal-text">All answer grades</h3>
            <ul className="mt-3 space-y-2 text-sm text-portal-muted">
              {gradingRun.answerGrades.map((grade) => (
                <li className="flex items-center justify-between rounded-xl border border-portal-border px-3 py-2" key={grade.id}>
                  <span>{grade.questionKind}</span>
                  <span>{grade.status}</span>
                </li>
              ))}
            </ul>
          </section>
          {pendingItems.map((item) => (
            <section className="grid gap-3 rounded-3xl border border-portal-border bg-white p-5" key={item.answerGradeId}>
              <QuestionContextPanel item={item} />
              <AnswerReviewPanel item={item} />
              <ManualGradeForm item={item} submitting={submitting} onSubmit={async (answerId, input) => {
                await manualGradeAnswer(answerId, input);
                await queue.refresh();
              }} />
            </section>
          ))}
        </>
      ) : null}
    </div>
  );
}
