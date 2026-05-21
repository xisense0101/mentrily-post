import { describe, expect, it } from 'vitest';
import {
  createAssessmentAnswerAutoGradedEvent,
  createAssessmentAnswerManuallyGradedEvent,
  createAssessmentAnswerPendingManualReviewEvent,
  createAssessmentAttemptResultUpdatedEvent,
  createAssessmentGradingRunCompletedEvent,
  createAssessmentGradingRunFailedEvent,
  createAssessmentGradingRunPartialEvent,
  createAssessmentGradingRunStartedEvent,
} from '../domain/index.js';

describe('Assessment grading events', () => {
  const tenantId = 'tenant-1';
  const workspaceId = 'workspace-1';
  const runId = 'run-1';

  it('creates grading run lifecycle events', () => {
    expect(
      createAssessmentGradingRunStartedEvent(runId, tenantId, workspaceId, {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
      }).eventName,
    ).toBe('assessment.grading.run.started');

    expect(
      createAssessmentGradingRunCompletedEvent(runId, tenantId, workspaceId, {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        totalScore: 3,
        maxScore: 5,
      }).eventVersion,
    ).toBe(1);

    expect(
      createAssessmentGradingRunPartialEvent(runId, tenantId, workspaceId, {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        totalScore: 3,
        maxScore: 5,
      }).aggregateId,
    ).toBe(runId);

    expect(
      createAssessmentGradingRunFailedEvent(runId, tenantId, workspaceId, {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        error: 'boom',
      }).payload.error,
    ).toBe('boom');
  });

  it('creates answer grading events and result update event', () => {
    expect(
      createAssessmentAnswerAutoGradedEvent(runId, tenantId, workspaceId, {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        questionId: 'question-1',
        answerId: 'answer-1',
        score: 1,
        maxScore: 1,
      }).payload.questionId,
    ).toBe('question-1');

    expect(
      createAssessmentAnswerPendingManualReviewEvent(runId, tenantId, workspaceId, {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        questionId: 'question-2',
        answerId: 'answer-2',
      }).eventName,
    ).toBe('assessment.answer.pending_manual_review');

    expect(
      createAssessmentAnswerManuallyGradedEvent(runId, tenantId, workspaceId, {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        questionId: 'question-3',
        answerId: 'answer-3',
        score: 4,
        maxScore: 5,
        gradedByPrincipalId: 'grader-1',
      }).payload.gradedByPrincipalId,
    ).toBe('grader-1');

    expect(
      createAssessmentAttemptResultUpdatedEvent('attempt-1', tenantId, workspaceId, {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        gradingStatus: 'GRADED',
        totalScore: 4,
        maxScore: 5,
      }).aggregateId,
    ).toBe('attempt-1');
  });
});
