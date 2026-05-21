/**
 * Assessment Domain Event Factories
 * Create typed, immutable domain events for Assessment Builder
 */

import { AssessmentDomainEvent, createEventBase } from './assessment-domain-event.js';

/**
 * assessment.created event
 */
export interface AssessmentCreatedPayload {
  title: string;
  purpose: string;
  ownerPrincipalId: string;
}

export const createAssessmentCreatedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentCreatedPayload,
): AssessmentDomainEvent<AssessmentCreatedPayload> => {
  return createEventBase('assessment.created', assessmentId, tenantId, workspaceId, payload);
};

/**
 * assessment.renamed event
 */
export interface AssessmentRenamedPayload {
  previousTitle: string;
  newTitle: string;
}

export const createAssessmentRenamedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentRenamedPayload,
): AssessmentDomainEvent<AssessmentRenamedPayload> => {
  return createEventBase('assessment.renamed', assessmentId, tenantId, workspaceId, payload);
};

/**
 * assessment.content_replaced event
 */
export interface AssessmentContentReplacedPayload {
  versionNumber: number;
  questionCount: number;
  sectionCount: number;
}

export const createAssessmentContentReplacedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentContentReplacedPayload,
): AssessmentDomainEvent<AssessmentContentReplacedPayload> => {
  return createEventBase(
    'assessment.content_replaced',
    assessmentId,
    tenantId,
    workspaceId,
    payload,
  );
};

/**
 * assessment.published event
 */
export interface AssessmentPublishedPayload {
  draftVersionNumber: number;
  snapshotVersionNumber: number;
  publishedByPrincipalId: string;
  questionCount: number;
  totalPoints: number;
}

export const createAssessmentPublishedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentPublishedPayload,
): AssessmentDomainEvent<AssessmentPublishedPayload> => {
  return createEventBase('assessment.published', assessmentId, tenantId, workspaceId, payload);
};

/**
 * assessment.archived event
 */
export interface AssessmentArchivedPayload {
  previousStatus: string;
}

export const createAssessmentArchivedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentArchivedPayload,
): AssessmentDomainEvent<AssessmentArchivedPayload> => {
  return createEventBase('assessment.archived', assessmentId, tenantId, workspaceId, payload);
};

/**
 * assessment.restored_to_draft event
 */
export interface AssessmentRestoredToDraftPayload {
  previousStatus: string;
  restoredAt: Date;
}

export const createAssessmentRestoredToDraftEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentRestoredToDraftPayload,
): AssessmentDomainEvent<AssessmentRestoredToDraftPayload> => {
  return createEventBase(
    'assessment.restored_to_draft',
    assessmentId,
    tenantId,
    workspaceId,
    payload,
  );
};

/**
 * assessment.version.created event
 */
export interface AssessmentVersionCreatedPayload {
  versionNumber: number;
  status: string;
  createdByPrincipalId: string;
}

export const createAssessmentVersionCreatedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentVersionCreatedPayload,
): AssessmentDomainEvent<AssessmentVersionCreatedPayload> => {
  return createEventBase(
    'assessment.version.created',
    assessmentId,
    tenantId,
    workspaceId,
    payload,
  );
};

/**
 * assessment.version.published event
 */
export interface AssessmentVersionPublishedPayload {
  draftVersionNumber: number;
  publishedByPrincipalId: string;
}

export const createAssessmentVersionPublishedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentVersionPublishedPayload,
): AssessmentDomainEvent<AssessmentVersionPublishedPayload> => {
  return createEventBase(
    'assessment.version.published',
    assessmentId,
    tenantId,
    workspaceId,
    payload,
  );
};

/**
 * assessment.snapshot.created event
 */
export interface AssessmentSnapshotCreatedPayload {
  snapshotId: string;
  versionNumber: number;
  publishedByPrincipalId: string;
  questionCount: number;
}

export const createAssessmentSnapshotCreatedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentSnapshotCreatedPayload,
): AssessmentDomainEvent<AssessmentSnapshotCreatedPayload> => {
  return createEventBase(
    'assessment.snapshot.created',
    assessmentId,
    tenantId,
    workspaceId,
    payload,
  );
};

/**
 * assessment.question.added event
 */
export interface AssessmentQuestionAddedPayload {
  questionId: string;
  kind: string;
  title: string;
  points: number;
  sectionId?: string;
  position: number;
}

export const createAssessmentQuestionAddedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentQuestionAddedPayload,
): AssessmentDomainEvent<AssessmentQuestionAddedPayload> => {
  return createEventBase('assessment.question.added', assessmentId, tenantId, workspaceId, payload);
};

/**
 * assessment.question.updated event
 */
export interface AssessmentQuestionUpdatedPayload {
  questionId: string;
  sectionId?: string;
  updates: Record<string, unknown>;
}

export const createAssessmentQuestionUpdatedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentQuestionUpdatedPayload,
): AssessmentDomainEvent<AssessmentQuestionUpdatedPayload> => {
  return createEventBase(
    'assessment.question.updated',
    assessmentId,
    tenantId,
    workspaceId,
    payload,
  );
};

/**
 * assessment.grading_rule.updated event
 */
export interface AssessmentGradingRuleUpdatedPayload {
  ruleId: string;
  ruleType: string;
  mode: string;
  questionId?: string;
}

export const createAssessmentGradingRuleUpdatedEvent = (
  assessmentId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentGradingRuleUpdatedPayload,
): AssessmentDomainEvent<AssessmentGradingRuleUpdatedPayload> => {
  return createEventBase(
    'assessment.grading_rule.updated',
    assessmentId,
    tenantId,
    workspaceId,
    payload,
  );
};

export interface AssessmentGradingRunStartedPayload {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
}

export const createAssessmentGradingRunStartedEvent = (
  gradingRunId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentGradingRunStartedPayload,
): AssessmentDomainEvent<AssessmentGradingRunStartedPayload> => {
  return createEventBase(
    'assessment.grading.run.started',
    gradingRunId,
    tenantId,
    workspaceId,
    payload,
  );
};

export interface AssessmentGradingRunCompletedPayload {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  totalScore: number;
  maxScore: number;
}

export const createAssessmentGradingRunCompletedEvent = (
  gradingRunId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentGradingRunCompletedPayload,
): AssessmentDomainEvent<AssessmentGradingRunCompletedPayload> => {
  return createEventBase(
    'assessment.grading.run.completed',
    gradingRunId,
    tenantId,
    workspaceId,
    payload,
  );
};

export interface AssessmentGradingRunPartialPayload {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  totalScore: number;
  maxScore: number;
}

export const createAssessmentGradingRunPartialEvent = (
  gradingRunId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentGradingRunPartialPayload,
): AssessmentDomainEvent<AssessmentGradingRunPartialPayload> => {
  return createEventBase(
    'assessment.grading.run.partial',
    gradingRunId,
    tenantId,
    workspaceId,
    payload,
  );
};

export interface AssessmentGradingRunFailedPayload {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  error: string;
}

export const createAssessmentGradingRunFailedEvent = (
  gradingRunId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentGradingRunFailedPayload,
): AssessmentDomainEvent<AssessmentGradingRunFailedPayload> => {
  return createEventBase(
    'assessment.grading.run.failed',
    gradingRunId,
    tenantId,
    workspaceId,
    payload,
  );
};

export interface AssessmentAnswerAutoGradedPayload {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  questionId: string;
  answerId: string;
  score: number;
  maxScore: number;
}

export const createAssessmentAnswerAutoGradedEvent = (
  gradingRunId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentAnswerAutoGradedPayload,
): AssessmentDomainEvent<AssessmentAnswerAutoGradedPayload> => {
  return createEventBase(
    'assessment.answer.auto_graded',
    gradingRunId,
    tenantId,
    workspaceId,
    payload,
  );
};

export interface AssessmentAnswerPendingManualReviewPayload {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  questionId: string;
  answerId: string;
}

export const createAssessmentAnswerPendingManualReviewEvent = (
  gradingRunId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentAnswerPendingManualReviewPayload,
): AssessmentDomainEvent<AssessmentAnswerPendingManualReviewPayload> => {
  return createEventBase(
    'assessment.answer.pending_manual_review',
    gradingRunId,
    tenantId,
    workspaceId,
    payload,
  );
};

export interface AssessmentAnswerManuallyGradedPayload {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  questionId: string;
  answerId: string;
  score: number;
  maxScore: number;
  gradedByPrincipalId: string;
}

export const createAssessmentAnswerManuallyGradedEvent = (
  gradingRunId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentAnswerManuallyGradedPayload,
): AssessmentDomainEvent<AssessmentAnswerManuallyGradedPayload> => {
  return createEventBase(
    'assessment.answer.manually_graded',
    gradingRunId,
    tenantId,
    workspaceId,
    payload,
  );
};

export interface AssessmentAttemptResultUpdatedPayload {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  gradingStatus: string;
  totalScore?: number;
  maxScore?: number;
}

export const createAssessmentAttemptResultUpdatedEvent = (
  attemptId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentAttemptResultUpdatedPayload,
): AssessmentDomainEvent<AssessmentAttemptResultUpdatedPayload> => {
  return createEventBase(
    'assessment.attempt.result.updated',
    attemptId,
    tenantId,
    workspaceId,
    payload,
  );
};

// --- Assessment Attempt Runtime Events (Task 011A) ---

/**
 * assessment.attempt.started event
 */
export interface AssessmentAttemptStartedPayload {
  assessmentId: string;
  snapshotId: string;
  learnerPrincipalId: string;
  expiresAt?: string;
}

export const createAssessmentAttemptStartedEvent = (
  attemptId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentAttemptStartedPayload,
): AssessmentDomainEvent<AssessmentAttemptStartedPayload> => {
  return createEventBase('assessment.attempt.started', attemptId, tenantId, workspaceId, payload);
};

/**
 * assessment.attempt.answer_saved event
 */
export interface AssessmentAttemptAnswerSavedPayload {
  assessmentId: string;
  snapshotId: string;
  learnerPrincipalId: string;
  questionId: string;
  questionKind: string;
}

export const createAssessmentAttemptAnswerSavedEvent = (
  attemptId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentAttemptAnswerSavedPayload,
): AssessmentDomainEvent<AssessmentAttemptAnswerSavedPayload> => {
  return createEventBase(
    'assessment.attempt.answer_saved',
    attemptId,
    tenantId,
    workspaceId,
    payload,
  );
};

/**
 * assessment.attempt.submitted event
 */
export interface AssessmentAttemptSubmittedPayload {
  assessmentId: string;
  snapshotId: string;
  learnerPrincipalId: string;
  answerCount: number;
}

export const createAssessmentAttemptSubmittedEvent = (
  attemptId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentAttemptSubmittedPayload,
): AssessmentDomainEvent<AssessmentAttemptSubmittedPayload> => {
  return createEventBase('assessment.attempt.submitted', attemptId, tenantId, workspaceId, payload);
};

/**
 * assessment.attempt.expired event
 */
export interface AssessmentAttemptExpiredPayload {
  assessmentId: string;
  snapshotId: string;
  learnerPrincipalId: string;
}

export const createAssessmentAttemptExpiredEvent = (
  attemptId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentAttemptExpiredPayload,
): AssessmentDomainEvent<AssessmentAttemptExpiredPayload> => {
  return createEventBase('assessment.attempt.expired', attemptId, tenantId, workspaceId, payload);
};

/**
 * assessment.attempt.cancelled event
 */
export interface AssessmentAttemptCancelledPayload {
  assessmentId: string;
  snapshotId: string;
  learnerPrincipalId: string;
}

export const createAssessmentAttemptCancelledEvent = (
  attemptId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentAttemptCancelledPayload,
): AssessmentDomainEvent<AssessmentAttemptCancelledPayload> => {
  return createEventBase('assessment.attempt.cancelled', attemptId, tenantId, workspaceId, payload);
};

/**
 * assessment.attempt.result.placeholder_created event
 */
export interface AssessmentAttemptResultPlaceholderCreatedPayload {
  assessmentId: string;
  snapshotId: string;
  learnerPrincipalId: string;
  resultId: string;
  gradingStatus: string;
}

export const createAssessmentAttemptResultPlaceholderCreatedEvent = (
  attemptId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentAttemptResultPlaceholderCreatedPayload,
): AssessmentDomainEvent<AssessmentAttemptResultPlaceholderCreatedPayload> => {
  return createEventBase(
    'assessment.attempt.result.placeholder_created',
    attemptId,
    tenantId,
    workspaceId,
    payload,
  );
};

export interface AssessmentResultReleasedPayload {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  learnerPrincipalId: string;
  score?: number;
  maxScore?: number;
  releasedAt: string;
}

export const createAssessmentResultReleasedEvent = (
  attemptId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentResultReleasedPayload,
): AssessmentDomainEvent<AssessmentResultReleasedPayload> => {
  return createEventBase('assessment.result.released', attemptId, tenantId, workspaceId, payload);
};

export interface AssessmentResultViewedPayload {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  learnerPrincipalId: string;
  releasedAt: string;
}

export const createAssessmentResultViewedEvent = (
  attemptId: string,
  tenantId: string,
  workspaceId: string,
  payload: AssessmentResultViewedPayload,
): AssessmentDomainEvent<AssessmentResultViewedPayload> => {
  return createEventBase('assessment.result.viewed', attemptId, tenantId, workspaceId, payload);
};
