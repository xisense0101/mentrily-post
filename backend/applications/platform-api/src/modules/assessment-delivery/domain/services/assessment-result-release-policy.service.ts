import {
  AssessmentAttemptGradingStatusEnum,
  AssessmentAttemptStatusEnum,
  type AssessmentAttemptGradingStatus,
  type AssessmentAttemptStatus,
} from '../value-objects/index.js';

export interface ResultReleaseDecision {
  allowed: boolean;
  reason?: string;
}

export interface CanReleaseResultInput {
  attemptStatus: AssessmentAttemptStatus;
  gradingStatus: AssessmentAttemptGradingStatus;
  releasedAt?: Date;
  hasPendingManualReview: boolean;
}

export interface CanLearnerViewResultInput {
  attemptStatus: AssessmentAttemptStatus;
  gradingStatus: AssessmentAttemptGradingStatus;
  releasedAt?: Date;
}

export class AssessmentResultReleasePolicyService {
  canReleaseResult(input: CanReleaseResultInput): ResultReleaseDecision {
    if (input.attemptStatus !== AssessmentAttemptStatusEnum.SUBMITTED) {
      return { allowed: false, reason: 'only submitted attempts can have results released' };
    }
    if (
      input.hasPendingManualReview ||
      input.gradingStatus === AssessmentAttemptGradingStatusEnum.PENDING_MANUAL_REVIEW
    ) {
      return { allowed: false, reason: 'result with pending manual review cannot be released' };
    }
    if (input.gradingStatus !== AssessmentAttemptGradingStatusEnum.GRADED) {
      return { allowed: false, reason: 'result must be graded before release' };
    }
    if (input.releasedAt !== undefined) {
      return { allowed: false, reason: 'result already released' };
    }
    return { allowed: true };
  }

  canLearnerViewResult(input: CanLearnerViewResultInput): ResultReleaseDecision {
    if (input.attemptStatus !== AssessmentAttemptStatusEnum.SUBMITTED) {
      return { allowed: false, reason: 'only submitted attempts can expose learner results' };
    }
    if (input.gradingStatus !== AssessmentAttemptGradingStatusEnum.RELEASED) {
      return { allowed: false, reason: 'learners can view only released results' };
    }
    if (input.releasedAt === undefined) {
      return { allowed: false, reason: 'released results require a release timestamp' };
    }
    return { allowed: true };
  }
}
