import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Input, Select } from '@mentrily/ui-system';
import { listAssessments } from '@/modules/assessment-builder/api';
import type { AssessmentContract } from '@/contracts/assessment-delivery';
import type {
  CourseAssessmentProgressSummaryContract,
  CreateLearningAssessmentLinkRequest,
  LearningAssessmentLinkContract,
  LearningCourseContract,
  UpdateLearningAssessmentLinkRequest,
} from '../../types';

interface CourseAssessmentLinkManagerProps {
  course: LearningCourseContract;
  links: LearningAssessmentLinkContract[];
  progressSummary: CourseAssessmentProgressSummaryContract | null;
  onCreateLink: (input: CreateLearningAssessmentLinkRequest) => Promise<void>;
  onUpdateLink: (linkId: string, input: UpdateLearningAssessmentLinkRequest) => Promise<void>;
  onRemoveLink: (linkId: string) => Promise<void>;
}

function formatScopeLabel(
  course: LearningCourseContract,
  link: LearningAssessmentLinkContract,
): string {
  if (!link.lessonId) {
    return 'Course level';
  }

  for (const section of course.sections) {
    const lesson = section.lessons.find((item) => item.id === link.lessonId);
    if (lesson) {
      return `${section.title} / ${lesson.title}`;
    }
  }

  return 'Lesson level';
}

export function CourseAssessmentLinkManager({
  course,
  links,
  progressSummary,
  onCreateLink,
  onUpdateLink,
  onRemoveLink,
}: CourseAssessmentLinkManagerProps) {
  const [assessments, setAssessments] = useState<AssessmentContract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [removingLinkId, setRemovingLinkId] = useState<string | null>(null);
  const [minimumScoreDrafts, setMinimumScoreDrafts] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState({
    assessmentId: '',
    lessonId: '',
    required: 'true',
    minimumScore: '',
    unlockPolicy: 'AFTER_LESSON_COMPLETE',
  });

  useEffect(() => {
    let active = true;

    async function loadAssessments(): Promise<void> {
      setLoadingAssessments(true);
      try {
        const nextAssessments = await listAssessments();
        if (!active) {
          return;
        }
        setAssessments(nextAssessments.filter((item) => item.status === 'PUBLISHED'));
        setError(null);
      } catch (cause) {
        if (!active) {
          return;
        }
        setError(cause instanceof Error ? cause.message : 'Assessment loading failed.');
      } finally {
        if (active) {
          setLoadingAssessments(false);
        }
      }
    }

    void loadAssessments();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMinimumScoreDrafts(
      Object.fromEntries(links.map((link) => [link.id, link.minimumScore?.toString() ?? ''])),
    );
  }, [links]);

  const lessonOptions = useMemo(
    () =>
      course.sections.flatMap((section) =>
        section.lessons.map((lesson) => ({
          id: lesson.id,
          label: `${section.title} / Lesson ${lesson.position + 1}`,
        })),
      ),
    [course.sections],
  );

  async function handleCreate(): Promise<void> {
    if (!formState.assessmentId) {
      setError('Select a published assessment to attach.');
      return;
    }

    setCreating(true);
    try {
      await onCreateLink({
        assessmentId: formState.assessmentId,
        required: formState.required === 'true',
        unlockPolicy: formState.lessonId ? 'AFTER_LESSON_COMPLETE' : 'IMMEDIATE',
        ...(formState.lessonId ? { lessonId: formState.lessonId } : {}),
        ...(formState.minimumScore ? { minimumScore: Number(formState.minimumScore) } : {}),
      });
      setFormState({
        assessmentId: '',
        lessonId: '',
        required: 'true',
        minimumScore: '',
        unlockPolicy: 'AFTER_LESSON_COMPLETE',
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assessment link creation failed.');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(link: LearningAssessmentLinkContract): Promise<void> {
    setEditingLinkId(link.id);
    try {
      await onUpdateLink(link.id, {
        required: !link.required,
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assessment link update failed.');
    } finally {
      setEditingLinkId(null);
    }
  }

  async function handleMinimumScoreUpdate(link: LearningAssessmentLinkContract): Promise<void> {
    setEditingLinkId(link.id);
    try {
      await onUpdateLink(link.id, {
        minimumScore: minimumScoreDrafts[link.id]?.trim()
          ? Number(minimumScoreDrafts[link.id])
          : null,
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Minimum score update failed.');
    } finally {
      setEditingLinkId(null);
    }
  }

  async function handleRemove(linkId: string): Promise<void> {
    setRemovingLinkId(linkId);
    try {
      await onRemoveLink(linkId);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assessment link removal failed.');
    } finally {
      setRemovingLinkId(null);
    }
  }

  return (
    <Card className="space-y-4" data-testid="course-assessment-link-manager">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Assessment links</h3>
        <p className="text-sm text-slate-600">
          Attach published workspace assessments to the course or a specific lesson.
        </p>
      </div>

      {progressSummary ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Required completion
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {progressSummary.completedRequiredAssessments} complete /{' '}
              {progressSummary.requiredAssessments} required
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pending grading
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {progressSummary.pendingGrading} learner submissions
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="assessment-link-assessment"
          >
            Assessment
          </label>
          <Select
            data-testid="assessment-link-assessment-select"
            disabled={loadingAssessments}
            id="assessment-link-assessment"
            value={formState.assessmentId}
            onChange={(event) =>
              setFormState((current) => ({ ...current, assessmentId: event.target.value }))
            }
          >
            <option value="">
              {loadingAssessments ? 'Loading assessments...' : 'Select assessment'}
            </option>
            {assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="assessment-link-lesson">
            Attach to
          </label>
          <Select
            data-testid="assessment-link-lesson-select"
            id="assessment-link-lesson"
            value={formState.lessonId}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                lessonId: event.target.value,
                unlockPolicy: event.target.value ? 'AFTER_LESSON_COMPLETE' : 'IMMEDIATE',
              }))
            }
          >
            <option value="">Course level</option>
            {lessonOptions.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="assessment-link-required">
            Requirement
          </label>
          <Select
            data-testid="assessment-link-required-select"
            id="assessment-link-required"
            value={formState.required}
            onChange={(event) =>
              setFormState((current) => ({ ...current, required: event.target.value }))
            }
          >
            <option value="true">Required</option>
            <option value="false">Optional</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="assessment-link-minimum-score"
          >
            Minimum score
          </label>
          <Input
            data-testid="assessment-link-minimum-score-input"
            id="assessment-link-minimum-score"
            inputMode="numeric"
            placeholder="Optional"
            value={formState.minimumScore}
            onChange={(event) =>
              setFormState((current) => ({ ...current, minimumScore: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
        <Button disabled={creating || loadingAssessments} onClick={() => void handleCreate()}>
          {creating ? 'Attaching...' : 'Attach assessment'}
        </Button>
      </div>

      <div className="space-y-3">
        {links.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No linked assessments yet.
          </div>
        ) : (
          links.map((link) => (
            <div
              className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              data-testid={`assessment-link-card-${link.id}`}
              key={link.id}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">
                      {link.assessmentTitle ?? link.assessmentId}
                    </p>
                    <Badge>{link.required ? 'Required' : 'Optional'}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{formatScopeLabel(course, link)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={editingLinkId === link.id}
                    variant="secondary"
                    onClick={() => void handleUpdate(link)}
                  >
                    {link.required ? 'Mark optional' : 'Mark required'}
                  </Button>
                  <Button
                    disabled={removingLinkId === link.id}
                    variant="secondary"
                    onClick={() => void handleRemove(link.id)}
                  >
                    {removingLinkId === link.id ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-end">
                <div className="w-full max-w-xs space-y-2">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor={`minimum-score-${link.id}`}
                  >
                    Minimum score
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id={`minimum-score-${link.id}`}
                      inputMode="numeric"
                      value={minimumScoreDrafts[link.id] ?? ''}
                      onChange={(event) =>
                        setMinimumScoreDrafts((current) => ({
                          ...current,
                          [link.id]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      disabled={editingLinkId === link.id}
                      variant="secondary"
                      onClick={() => void handleMinimumScoreUpdate(link)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {link.lessonId
                    ? 'Unlocks after lesson completion.'
                    : 'Available immediately at course level.'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
