import { beforeEach, describe, expect, it, vi } from 'vitest';
import { changeValue, clickElement, getByLabelText, getByText, render, waitFor } from '@/testing';
import { CourseAssessmentLinkManager } from '../components/creator';
import type { LearningCourseContract } from '../types';

vi.mock('@/modules/assessment-builder/api', () => ({
  listAssessments: vi.fn(async () => [
    {
      id: 'assessment-1',
      title: 'Linked quiz',
      status: 'PUBLISHED',
      purpose: 'QUIZ',
      visibility: 'WORKSPACE',
      ownerPrincipalId: 'owner-1',
      attemptPolicy: {},
      resultReleasePolicy: 'MANUAL_RELEASE',
      metadata: {},
      gradingRubrics: [],
      gradingRules: [],
      createdAt: '2026-05-24T00:00:00.000Z',
      updatedAt: '2026-05-24T00:00:00.000Z',
    },
  ]),
}));

describe('CourseAssessmentLinkManager', () => {
  const course: LearningCourseContract = {
    id: 'course-1',
    title: 'Delivery course',
    slug: 'delivery-course',
    status: 'DRAFT',
    visibility: 'WORKSPACE',
    sections: [
      {
        id: 'section-1',
        title: 'Week 1',
        position: 0,
        lessons: [
          { id: 'lesson-1', title: 'Lesson 1', kind: 'TEXT', position: 0, isRequired: true },
        ],
      },
    ],
  };

  const onCreateLink = vi.fn(async () => undefined);
  const onUpdateLink = vi.fn(async () => undefined);
  const onRemoveLink = vi.fn(async () => undefined);

  beforeEach(() => {
    onCreateLink.mockClear();
    onUpdateLink.mockClear();
    onRemoveLink.mockClear();
  });

  it('creates a lesson assessment link from portal controls', async () => {
    const rendered = await render(
      <CourseAssessmentLinkManager
        course={course}
        links={[]}
        onCreateLink={onCreateLink}
        onRemoveLink={onRemoveLink}
        onUpdateLink={onUpdateLink}
        progressSummary={null}
      />,
    );

    await waitFor(() => {
      expect(getByText(rendered.container, 'Linked quiz')).toBeTruthy();
    });

    const assessmentSelect = getByLabelText(rendered.container, 'Assessment') as HTMLSelectElement;
    const lessonSelect = getByLabelText(rendered.container, 'Attach to') as HTMLSelectElement;
    const minimumScoreInput = getByLabelText(
      rendered.container,
      'Minimum score',
    ) as HTMLInputElement;

    await changeValue(assessmentSelect, 'assessment-1');
    await changeValue(lessonSelect, 'lesson-1');
    await changeValue(minimumScoreInput, '85');

    await clickElement(getByText(rendered.container, 'Attach assessment'));

    expect(onCreateLink).toHaveBeenCalledWith({
      assessmentId: 'assessment-1',
      lessonId: 'lesson-1',
      required: true,
      unlockPolicy: 'AFTER_LESSON_COMPLETE',
      minimumScore: 85,
    });
  });

  it('updates and removes existing links', async () => {
    const rendered = await render(
      <CourseAssessmentLinkManager
        course={course}
        links={[
          {
            id: 'link-1',
            courseId: 'course-1',
            lessonId: 'lesson-1',
            assessmentId: 'assessment-1',
            assessmentTitle: 'Linked quiz',
            assessmentStatus: 'PUBLISHED',
            required: true,
            position: 0,
            unlockPolicy: 'AFTER_LESSON_COMPLETE',
            createdByPrincipalId: 'creator-1',
            createdAt: '2026-05-24T00:00:00.000Z',
            updatedAt: '2026-05-24T00:00:00.000Z',
          },
        ]}
        onCreateLink={onCreateLink}
        onRemoveLink={onRemoveLink}
        onUpdateLink={onUpdateLink}
        progressSummary={null}
      />,
    );

    await clickElement(getByText(rendered.container, 'Mark optional'));
    await clickElement(getByText(rendered.container, 'Remove'));

    expect(onUpdateLink).toHaveBeenCalledWith('link-1', { required: false });
    expect(onRemoveLink).toHaveBeenCalledWith('link-1');
  });
});
