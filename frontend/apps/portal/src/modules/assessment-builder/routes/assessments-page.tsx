'use client';

import { useState } from 'react';
import { assessmentApiClient } from '../api';
import {
  AssessmentCard,
  AssessmentCreateForm,
  AssessmentEmptyState,
  AssessmentListSkeleton,
} from '../components/assessments';
import { AssessmentErrorState, AssessmentPageHeader } from '../components/shared';
import { useAssessments } from '../hooks';

export function AssessmentsPage() {
  const { assessments, loading, error, refresh, createAssessment } =
    useAssessments(assessmentApiClient);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCreate(input: Parameters<typeof createAssessment>[0]): Promise<void> {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createAssessment(input);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Assessment creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8" data-testid="assessments-page">
      <AssessmentPageHeader
        eyebrow="Assessment Builder"
        title="Assessments"
        description="Create exams, quizzes, assignments, and structured question sets for your learners."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <AssessmentCreateForm
          errorMessage={submitError}
          isPending={isSubmitting}
          onSubmit={handleCreate}
        />

        <section className="space-y-4 rounded-[2rem] border border-portal-border bg-white/75 p-4 shadow-portal-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-2 pt-1">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Assessment library</h2>
              <p className="text-sm text-slate-600">
                Drafts, published exams, and archived assessments.
              </p>
            </div>
            <div className="rounded-full border border-portal-border bg-portal-surface-muted px-3 py-1 text-xs font-semibold text-portal-text-muted">
              {assessments.length} assessments
            </div>
          </div>

          {loading ? <AssessmentListSkeleton /> : null}

          {!loading && error ? (
            <AssessmentErrorState message={error} onRetry={() => void refresh()} />
          ) : null}

          {!loading && !error && assessments.length === 0 ? <AssessmentEmptyState /> : null}

          {!loading && !error && assessments.length > 0 ? (
            <div className="grid gap-4" data-testid="assessment-list">
              {assessments.map((assessment) => (
                <AssessmentCard
                  assessment={assessment}
                  href={`/assessments/${assessment.id}`}
                  key={assessment.id}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
