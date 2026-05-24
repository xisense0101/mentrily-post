import { describe, expect, it } from 'vitest';
import { queryByText, render } from '@/testing';
import { LearnerLinkedAssessmentCard } from '../components/learner';

describe('LearnerLinkedAssessmentCard', () => {
  it('shows pending state without leaking unreleased scores', async () => {
    const rendered = await render(
      <LearnerLinkedAssessmentCard
        assessment={{
          id: 'link-1',
          courseId: 'course-1',
          lessonId: 'lesson-1',
          assessmentId: 'assessment-1',
          assessmentTitle: 'Checkpoint',
          required: true,
          position: 0,
          unlockPolicy: 'AFTER_LESSON_COMPLETE',
          status: 'AWAITING_GRADING',
          available: true,
          attemptId: 'attempt-1',
          resultReleased: false,
          blockingCompletion: true,
        }}
      />,
    );

    expect(rendered.container.textContent).toContain('Result pending');
    expect(rendered.container.textContent).not.toContain('3/4');
    expect(queryByText(rendered.container, 'View result')).toBeNull();
  });

  it('shows released learner-safe result summary', async () => {
    const rendered = await render(
      <LearnerLinkedAssessmentCard
        assessment={{
          id: 'link-2',
          courseId: 'course-1',
          assessmentId: 'assessment-2',
          assessmentTitle: 'Final quiz',
          required: false,
          position: 1,
          unlockPolicy: 'IMMEDIATE',
          status: 'PASSED',
          available: true,
          attemptId: 'attempt-2',
          resultReleased: true,
          score: 9,
          maxScore: 10,
          passed: true,
          blockingCompletion: false,
        }}
      />,
    );

    expect(rendered.container.textContent).toContain('9/10');
    expect(rendered.container.textContent).toContain('Passed');
    expect(rendered.container.textContent).not.toContain('private');
  });
});
