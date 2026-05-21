'use client';

import { useState } from 'react';
import { LearningErrorState, LearningPageHeader } from '../components/shared';
import {
  CourseCreateForm,
  CourseEmptyState,
  CourseListCard,
  CourseListSkeleton,
} from '../components/creator';
import { useCreatorLearningCourses } from '../hooks';

export function CreatorLearningPage() {
  const { courses, createCourse, error, loading, refresh } =
    useCreatorLearningCourses();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCreateCourse(
    input: Parameters<typeof createCourse>[0],
  ): Promise<void> {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createCourse(input);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Course creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8" data-testid="creator-learning-page">
      <LearningPageHeader
        eyebrow="Creator workspace"
        title="Learning courses"
        description="Create, review, and publish workspace learning offerings backed by the live Learning Delivery API."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <CourseCreateForm
          errorMessage={submitError}
          isPending={isSubmitting}
          onSubmit={handleCreateCourse}
        />

        <section className="space-y-4 rounded-[2rem] border border-portal-border bg-white/75 p-4 shadow-portal-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-2 pt-1">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Course library</h2>
              <p className="text-sm text-slate-600">
                Draft and published course shells available in this workspace.
              </p>
            </div>
            <div className="rounded-full border border-portal-border bg-portal-surface-muted px-3 py-1 text-xs font-semibold text-portal-text-muted">
              {courses.length} courses
            </div>
          </div>
          {loading ? <CourseListSkeleton /> : null}
          {!loading && error ? (
            <LearningErrorState message={error} onRetry={() => void refresh()} />
          ) : null}
          {!loading && !error && courses.length === 0 ? <CourseEmptyState /> : null}
          {!loading && !error && courses.length > 0 ? (
            <div className="grid gap-4" data-testid="course-list">
              {courses.map((course) => (
                <CourseListCard
                  course={course}
                  href={`/learning/courses/${course.id}`}
                  key={course.id}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
