import { describe, expect, it } from 'vitest';
import { LearningAssessmentLinkPolicyService } from '../application/services/learning-assessment-link-policy.service.js';
import { LearningAssessmentLink } from '../domain/entities/learning-assessment-link.entity.js';

describe('LearningAssessmentLinkPolicyService', () => {
  const service = new LearningAssessmentLinkPolicyService();

  function makeLink() {
    return LearningAssessmentLink.createDraft({
      id: 'link-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      courseId: 'course-1',
      lessonId: 'lesson-1',
      assessmentId: 'assessment-1',
      required: true,
      position: 0,
      unlockPolicy: 'AFTER_LESSON_COMPLETE',
      minimumScore: 70,
      createdByPrincipalId: 'creator-1',
    });
  }

  it('does not expose unreleased score data to the learner view', () => {
    const view = service.toLearnerView({
      link: makeLink(),
      assessment: { status: 'PUBLISHED', title: 'Quiz 1' } as never,
      attempt: {
        id: 'attempt-1',
        status: 'SUBMITTED',
        result: {
          gradingStatus: 'GRADED',
          score: { value: 92 },
          maxScore: { value: 100 },
        },
      } as never,
      lessonProgressCompleted: true,
    });

    expect(view.status).toBe('AWAITING_GRADING');
    expect(view.resultReleased).toBe(false);
    expect(view.score).toBeUndefined();
    expect(view.maxScore).toBeUndefined();
    expect(view.passed).toBeUndefined();
  });

  it('blocks course completion until required assessments are released and satisfy minimum score', () => {
    const link = makeLink();
    const summary = service.summarize({
      links: [link],
      attemptsByLinkId: new Map([
        [
          link.id,
          {
            status: 'SUBMITTED',
            result: {
              gradingStatus: 'RELEASED',
              releasedAt: new Date('2026-05-24T00:00:00.000Z'),
              score: { value: 65 },
            },
          } as never,
        ],
      ]),
      lessonProgressCompletedByLessonId: new Map([['lesson-1', true]]),
      assessmentById: new Map([[link.assessmentId, { status: 'PUBLISHED' } as never]]),
    });

    expect(summary.blockedRequiredAssessments).toBe(1);
    expect(summary.canCompleteCourse).toBe(false);
  });
});
