'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input } from '@mentrily/ui-system';
import {
  getLearningCourse,
  markLearningProgress,
} from '../api';
import {
  EnrollmentCard,
  EnrollmentEmptyState,
  EnrollmentListSkeleton,
  LearnerCourseOutline,
} from '../components/learner';
import { LearningErrorState, LearningPageHeader } from '../components/shared';
import { useLearnerEnrollments } from '../hooks';
import type {
  LearningCourseContract,
  LearningEnrollmentContract,
  LearningProgressAction,
  LearningProgressContract,
} from '../types';

export function LearnerLearningPage() {
  const { completeEnrollment, enrollCourse, enrollments, error, loading, refresh } =
    useLearnerEnrollments();
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<LearningCourseContract | null>(null);
  const [progressByLessonId, setProgressByLessonId] = useState<
    Record<string, LearningProgressContract | undefined>
  >({});
  const [selectedCourseError, setSelectedCourseError] = useState<string | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const selectedEnrollment = useMemo(
    () =>
      selectedEnrollmentId
        ? enrollments.find((item) => item.id === selectedEnrollmentId) ?? null
        : null,
    [enrollments, selectedEnrollmentId],
  );

  async function loadCourseOutline(courseId: string): Promise<void> {
    setIsLoadingCourse(true);
    try {
      const course = await getLearningCourse(courseId);
      setSelectedCourse(course);
      setSelectedCourseError(null);
    } catch (cause) {
      setSelectedCourseError(
        cause instanceof Error ? cause.message : 'Failed to load course outline.',
      );
    } finally {
      setIsLoadingCourse(false);
    }
  }

  useEffect(() => {
    if (selectedEnrollment?.courseId) {
      void loadCourseOutline(selectedEnrollment.courseId);
    }
  }, [selectedEnrollment?.courseId]);

  async function handleEnroll(): Promise<void> {
    if (!enrollCourseId.trim()) {
      setSelectedCourseError('A published course ID is required for enrollment.');
      return;
    }

    setIsEnrolling(true);
    try {
      const enrollment = await enrollCourse(enrollCourseId.trim(), {});
      setSelectedEnrollmentId(enrollment.id);
      await loadCourseOutline(enrollment.courseId);
      setEnrollCourseId('');
      setSelectedCourseError(null);
    } catch (cause) {
      setSelectedCourseError(cause instanceof Error ? cause.message : 'Enrollment failed.');
    } finally {
      setIsEnrolling(false);
    }
  }

  async function handleProgressAction(
    lessonId: string,
    action: LearningProgressAction,
  ): Promise<void> {
    if (!selectedEnrollmentId) {
      return;
    }

    setPendingLessonId(lessonId);
    try {
      const progress = await markLearningProgress(selectedEnrollmentId, lessonId, {
        action,
      });
      setProgressByLessonId((current) => ({
        ...current,
        [progress.lessonId]: progress,
      }));
      setSelectedCourseError(null);
    } catch (cause) {
      setSelectedCourseError(
        cause instanceof Error ? cause.message : 'Progress update failed.',
      );
    } finally {
      setPendingLessonId(null);
    }
  }

  async function handleCompleteEnrollment(): Promise<void> {
    if (!selectedEnrollmentId) {
      return;
    }

    setIsCompleting(true);
    try {
      const completed = await completeEnrollment(selectedEnrollmentId);
      setSelectedEnrollmentId(completed.id);
      setSelectedCourseError(null);
      await refresh();
    } catch (cause) {
      setSelectedCourseError(
        cause instanceof Error ? cause.message : 'Enrollment completion failed.',
      );
    } finally {
      setIsCompleting(false);
    }
  }

  function selectEnrollment(enrollment: LearningEnrollmentContract): void {
    setSelectedEnrollmentId(enrollment.id);
  }

  return (
    <div className="space-y-8" data-testid="learner-learning-page">
      <LearningPageHeader
        eyebrow="Learner workspace"
        title="Learning enrollments"
        description="Enroll in published courses, inspect the course outline, and record lesson progress from the frontend foundation."
      />

      <Card className="space-y-4 rounded-[2rem]">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Enroll in a published course</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use a known course ID from a published course to create a learner enrollment.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="enroll-course-id">
              Course ID
            </label>
            <div data-testid="enroll-course-id-input">
              <Input
                id="enroll-course-id"
                placeholder="Paste a published course UUID"
                value={enrollCourseId}
                onChange={(event) => setEnrollCourseId(event.target.value)}
              />
            </div>
          </div>
          <div className="md:self-end" data-testid="enroll-course-submit">
            <Button disabled={isEnrolling} onClick={() => void handleEnroll()}>
              {isEnrolling ? 'Enrolling...' : 'Enroll'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="space-y-4 rounded-[2rem] border border-portal-border bg-white/75 p-4 shadow-portal-sm backdrop-blur">
          {loading ? <EnrollmentListSkeleton /> : null}
          {!loading && error ? (
            <LearningErrorState message={error} onRetry={() => void refresh()} />
          ) : null}
          {!loading && !error && enrollments.length === 0 ? <EnrollmentEmptyState /> : null}
          {!loading && !error && enrollments.length > 0 ? (
            <div className="grid gap-4" data-testid="enrollment-list">
              {enrollments.map((enrollment) => (
                <EnrollmentCard
                  enrollment={enrollment}
                  key={enrollment.id}
                  onSelect={() => selectEnrollment(enrollment)}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          {selectedCourseError ? (
            <LearningErrorState
              message={selectedCourseError}
              onRetry={() =>
                selectedEnrollment?.courseId
                  ? void loadCourseOutline(selectedEnrollment.courseId)
                  : undefined
              }
            />
          ) : null}

          {isLoadingCourse ? (
            <p className="text-sm text-slate-500">Loading learner course outline...</p>
          ) : null}

          {!selectedEnrollment ? (
            <Card className="rounded-[2rem]">
              <h3 className="text-lg font-semibold text-slate-900">Select an enrollment</h3>
              <p className="mt-2 text-sm text-slate-600">
                Choose an enrollment to inspect the course outline and record learner progress.
              </p>
            </Card>
          ) : selectedCourse ? (
            <Card className="space-y-4 rounded-[2rem]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">{selectedCourse.title}</h3>
                  <p className="text-sm text-slate-600">
                    Enrollment {selectedEnrollment.id} · {selectedEnrollment.status}
                  </p>
                </div>
                <div data-testid="enrollment-complete-button">
                  <Button
                    disabled={isCompleting}
                    onClick={() => void handleCompleteEnrollment()}
                  >
                    {isCompleting ? 'Completing...' : 'Complete enrollment'}
                  </Button>
                </div>
              </div>
              <LearnerCourseOutline
                course={selectedCourse}
                onProgressAction={handleProgressAction}
                pendingLessonId={pendingLessonId}
                progressByLessonId={progressByLessonId}
              />
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  );
}
