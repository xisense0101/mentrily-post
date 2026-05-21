import { describe, expect, it } from 'vitest';
import {
  createAssessmentAttemptAnswerSavedEvent,
  createAssessmentAttemptCancelledEvent,
  createAssessmentAttemptExpiredEvent,
  createAssessmentAttemptResultPlaceholderCreatedEvent,
  createAssessmentAttemptStartedEvent,
  createAssessmentAttemptSubmittedEvent,
} from '../domain/events/index.js';

describe('Assessment attempt events', () => {
  const attemptId = '30000000-0000-4000-8000-000000000001';
  const tenantId = '30000000-0000-4000-8000-000000000002';
  const workspaceId = '30000000-0000-4000-8000-000000000003';
  const assessmentId = '30000000-0000-4000-8000-000000000004';
  const snapshotId = '30000000-0000-4000-8000-000000000005';
  const learnerPrincipalId = '30000000-0000-4000-8000-000000000006';

  it('creates attempt lifecycle events with the attempt as aggregate id', () => {
    const started = createAssessmentAttemptStartedEvent(attemptId, tenantId, workspaceId, {
      assessmentId,
      snapshotId,
      learnerPrincipalId,
    });
    const submitted = createAssessmentAttemptSubmittedEvent(attemptId, tenantId, workspaceId, {
      assessmentId,
      snapshotId,
      learnerPrincipalId,
      answerCount: 2,
    });
    const expired = createAssessmentAttemptExpiredEvent(attemptId, tenantId, workspaceId, {
      assessmentId,
      snapshotId,
      learnerPrincipalId,
    });
    const cancelled = createAssessmentAttemptCancelledEvent(attemptId, tenantId, workspaceId, {
      assessmentId,
      snapshotId,
      learnerPrincipalId,
    });

    for (const event of [started, submitted, expired, cancelled]) {
      expect(event.aggregateId).toBe(attemptId);
      expect(event.tenantId).toBe(tenantId);
      expect(event.workspaceId).toBe(workspaceId);
      expect(event.eventVersion).toBe(1);
      expect(event.payload).toMatchObject({ assessmentId, snapshotId, learnerPrincipalId });
    }
  });

  it('creates answer-saved and result-placeholder events', () => {
    const answerSaved = createAssessmentAttemptAnswerSavedEvent(attemptId, tenantId, workspaceId, {
      assessmentId,
      snapshotId,
      learnerPrincipalId,
      questionId: '30000000-0000-4000-8000-000000000007',
      questionKind: 'MCQ',
    });
    const placeholder = createAssessmentAttemptResultPlaceholderCreatedEvent(
      attemptId,
      tenantId,
      workspaceId,
      {
        assessmentId,
        snapshotId,
        learnerPrincipalId,
        resultId: '30000000-0000-4000-8000-000000000008',
        gradingStatus: 'NOT_GRADED',
      },
    );

    expect(answerSaved.eventName).toBe('assessment.attempt.answer_saved');
    expect(placeholder.eventName).toBe('assessment.attempt.result.placeholder_created');
    expect(placeholder.payload).toMatchObject({ gradingStatus: 'NOT_GRADED' });
  });
});
