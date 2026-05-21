/**
 * AssessmentAttemptSubmissionPolicyService
 * Domain service for enforcing answer save and submission policies.
 *
 * Policy decision on submitting with zero answers:
 * Submitting with zero answers IS ALLOWED. A learner may choose to submit
 * without answering any questions (e.g., timed out or gave up).
 * Grading should handle zero-answer attempts as unanswered.
 */

import type { AssessmentAttempt } from '../entities/assessment-attempt.entity.js';
import { AssessmentAttemptStatusEnum } from '../value-objects/assessment-attempt-status.vo.js';

export interface SubmissionPolicyResult {
  allowed: boolean;
  reason?: string;
}

export class AssessmentAttemptSubmissionPolicyService {
  /**
   * Check if a learner can save an answer on this attempt.
   */
  canSaveAnswer(attempt: AssessmentAttempt, now: Date = new Date()): SubmissionPolicyResult {
    if (attempt.status !== AssessmentAttemptStatusEnum.IN_PROGRESS) {
      return {
        allowed: false,
        reason: `Cannot save answer: attempt status is "${attempt.status}"`,
      };
    }

    if (attempt.isSessionExpired(now)) {
      return {
        allowed: false,
        reason: 'Cannot save answer: attempt session has expired',
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a learner can submit this attempt.
   * Submitting with zero answers is allowed.
   */
  canSubmit(attempt: AssessmentAttempt, now: Date = new Date()): SubmissionPolicyResult {
    if (attempt.status !== AssessmentAttemptStatusEnum.IN_PROGRESS) {
      return {
        allowed: false,
        reason: `Cannot submit: attempt status is "${attempt.status}"`,
      };
    }

    if (attempt.isSessionExpired(now)) {
      return {
        allowed: false,
        reason: 'Cannot submit: attempt session has expired',
      };
    }

    return { allowed: true };
  }
}
