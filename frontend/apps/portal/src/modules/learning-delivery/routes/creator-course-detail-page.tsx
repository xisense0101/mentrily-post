'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Select, Textarea } from '@mentrily/ui-system';
import type {
  AddLearningLessonRequest,
  AddLearningSectionRequest,
  CourseAssessmentProgressSummaryContract,
  CreateLearningAssessmentLinkRequest,
  LearningAssessmentLinkContract,
  LearningCourseContract,
  LearningVisibility,
  UpdateLearningAssessmentLinkRequest,
  UpdateLearningCourseRequest,
} from '../types';
import {
  archiveLearningCourse,
  addLearningLesson,
  addLearningSection,
  createAssessmentLink,
  getCourseAssessmentProgressSummary,
  getLearningCourse,
  listCourseAssessmentLinks,
  publishLearningCourse,
  removeAssessmentLink,
  updateAssessmentLink,
  updateLearningCourse,
} from '../api';
import {
  CourseActionBar,
  CourseAssessmentLinkManager,
  CourseDetailPanel,
  CoursePublishPanel,
  LessonCreateForm,
  SectionCreateForm,
} from '../components/creator';
import { LearningErrorState, LearningPageHeader } from '../components/shared';

interface CreatorCourseDetailPageProps {
  courseId: string;
}

export function CreatorCourseDetailPage({ courseId }: CreatorCourseDetailPageProps) {
  const [course, setCourse] = useState<LearningCourseContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metaState, setMetaState] = useState({
    title: '',
    description: '',
    visibility: 'WORKSPACE' as LearningVisibility,
  });
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [assessmentLinks, setAssessmentLinks] = useState<LearningAssessmentLinkContract[]>([]);
  const [progressSummary, setProgressSummary] =
    useState<CourseAssessmentProgressSummaryContract | null>(null);

  async function loadAssessmentData(targetCourseId: string): Promise<void> {
    const [nextLinks, nextSummary] = await Promise.all([
      listCourseAssessmentLinks(targetCourseId),
      getCourseAssessmentProgressSummary(targetCourseId).catch(() => null),
    ]);
    setAssessmentLinks(nextLinks);
    setProgressSummary(nextSummary);
  }

  async function loadCourse(): Promise<void> {
    setLoading(true);
    try {
      const nextCourse = await getLearningCourse(courseId);
      await loadAssessmentData(nextCourse.id);
      setCourse(nextCourse);
      setMetaState({
        title: nextCourse.title,
        description: nextCourse.description ?? '',
        visibility: nextCourse.visibility,
      });
      setSelectedSectionId((current) => current || nextCourse.sections[0]?.id || '');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Course loading failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAssessmentLink(
    input: CreateLearningAssessmentLinkRequest,
  ): Promise<void> {
    if (!course) {
      return;
    }

    await createAssessmentLink(course.id, input);
    await loadAssessmentData(course.id);
  }

  async function handleUpdateAssessmentLink(
    linkId: string,
    input: UpdateLearningAssessmentLinkRequest,
  ): Promise<void> {
    if (!course) {
      return;
    }

    await updateAssessmentLink(course.id, linkId, input);
    await loadAssessmentData(course.id);
  }

  async function handleRemoveAssessmentLink(linkId: string): Promise<void> {
    if (!course) {
      return;
    }

    await removeAssessmentLink(course.id, linkId);
    await loadAssessmentData(course.id);
  }

  useEffect(() => {
    void loadCourse();
  }, [courseId]);

  const hasSections = (course?.sections.length ?? 0) > 0;

  const sortedSections = useMemo(
    () => [...(course?.sections ?? [])].sort((left, right) => left.position - right.position),
    [course],
  );

  async function handleUpdateMetadata(): Promise<void> {
    if (!course) {
      return;
    }

    setIsSavingMeta(true);
    try {
      const input: UpdateLearningCourseRequest = {
        title: metaState.title.trim(),
        description: metaState.description.trim() || null,
        visibility: metaState.visibility,
      };
      const nextCourse = await updateLearningCourse(course.id, input);
      setCourse(nextCourse);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Course update failed.');
    } finally {
      setIsSavingMeta(false);
    }
  }

  async function handleAddSection(input: AddLearningSectionRequest): Promise<void> {
    if (!course) {
      return;
    }

    setIsAddingSection(true);
    try {
      const nextCourse = await addLearningSection(course.id, input);
      setCourse(nextCourse);
      setSelectedSectionId(nextCourse.sections[nextCourse.sections.length - 1]?.id ?? '');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Section creation failed.');
    } finally {
      setIsAddingSection(false);
    }
  }

  async function handleAddLesson(input: AddLearningLessonRequest): Promise<void> {
    if (!course || !selectedSectionId) {
      return;
    }

    setIsAddingLesson(true);
    try {
      const nextCourse = await addLearningLesson(course.id, selectedSectionId, input);
      setCourse(nextCourse);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lesson creation failed.');
    } finally {
      setIsAddingLesson(false);
    }
  }

  async function handlePublish(): Promise<void> {
    if (!course) {
      return;
    }

    setIsPublishing(true);
    try {
      const nextCourse = await publishLearningCourse(course.id);
      setCourse(nextCourse);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Publish failed.');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleArchive(): Promise<void> {
    if (!course) {
      return;
    }

    setIsArchiving(true);
    try {
      const nextCourse = await archiveLearningCourse(course.id);
      setCourse(nextCourse);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Archive failed.');
    } finally {
      setIsArchiving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading course...</p>;
  }

  if (error && !course) {
    return <LearningErrorState message={error} onRetry={() => void loadCourse()} />;
  }

  if (!course) {
    return (
      <LearningErrorState message="Course data is unavailable." onRetry={() => void loadCourse()} />
    );
  }

  return (
    <div className="space-y-6" data-testid="course-detail-page">
      <LearningPageHeader
        eyebrow="Creator course detail"
        title={course.title}
        description="Maintain the course shell, expand sections, and manage publishing actions from the frontend foundation."
        actions={
          <a
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            href="/learning/courses"
          >
            Back to courses
          </a>
        }
      />

      {error ? <LearningErrorState message={error} onRetry={() => void loadCourse()} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <CourseDetailPanel course={course} />
          <CourseAssessmentLinkManager
            course={course}
            links={assessmentLinks}
            onCreateLink={handleCreateAssessmentLink}
            onRemoveLink={handleRemoveAssessmentLink}
            onUpdateLink={handleUpdateAssessmentLink}
            progressSummary={progressSummary}
          />
          <SectionCreateForm isPending={isAddingSection} onSubmit={handleAddSection} />
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Add a lesson</h3>
              <p className="text-sm text-slate-600">
                Select the target section and add the next lesson to the outline.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="lesson-section">
                Target section
              </label>
              <Select
                data-testid="lesson-section-select"
                disabled={!hasSections}
                id="lesson-section"
                value={selectedSectionId}
                onChange={(event) => setSelectedSectionId(event.target.value)}
              >
                {sortedSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </Select>
            </div>
            <LessonCreateForm
              disabled={!hasSections}
              isPending={isAddingLesson}
              onSubmit={handleAddLesson}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Course metadata</h3>
              <p className="text-sm text-slate-600">
                Update the title, description, and visibility without leaving the detail page.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="course-title">
                Title
              </label>
              <Input
                data-testid="course-title-input"
                id="course-title"
                value={metaState.title}
                onChange={(event) =>
                  setMetaState((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="course-description">
                Description
              </label>
              <Textarea
                data-testid="course-description-input"
                id="course-description"
                value={metaState.description}
                onChange={(event) =>
                  setMetaState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="course-visibility">
                Visibility
              </label>
              <Select
                data-testid="course-visibility-select"
                id="course-visibility"
                value={metaState.visibility}
                onChange={(event) =>
                  setMetaState((current) => ({
                    ...current,
                    visibility: event.target.value as LearningVisibility,
                  }))
                }
              >
                <option value="PRIVATE">Private</option>
                <option value="WORKSPACE">Workspace</option>
                <option value="PUBLIC">Public</option>
                <option value="UNLISTED">Unlisted</option>
              </Select>
            </div>
            <Button disabled={isSavingMeta} onClick={() => void handleUpdateMetadata()}>
              {isSavingMeta ? 'Saving...' : 'Save metadata'}
            </Button>
          </Card>

          <CoursePublishPanel
            course={course}
            isPublishing={isPublishing}
            onPublish={() => void handlePublish()}
          />

          <CourseActionBar
            isArchiving={isArchiving}
            onArchive={() => void handleArchive()}
            onRefresh={() => void loadCourse()}
          />
        </div>
      </div>
    </div>
  );
}
