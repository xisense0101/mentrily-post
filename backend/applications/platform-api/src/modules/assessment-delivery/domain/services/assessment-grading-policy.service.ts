import { AssessmentAttempt, AssessmentAttemptResult } from '../entities/index.js';
import {
  AssessmentAttemptStatusEnum,
  AssessmentAttemptGradingStatusEnum,
} from '../value-objects/index.js';

export interface AssessmentAttemptGradingPolicyResult {
  allowed: boolean;
  reason?: string;
}

export class AssessmentGradingPolicyService {
  canGradeAttempt(attempt: AssessmentAttempt): AssessmentAttemptGradingPolicyResult {
    if (attempt.status !== AssessmentAttemptStatusEnum.SUBMITTED) {
      return { allowed: false, reason: 'Only submitted attempts can be graded' };
    }
    if (attempt.result?.isReleased()) {
      return { allowed: false, reason: 'Released results cannot be regraded' };
    }
    return { allowed: true };
  }

  canRegradeAttemptResult(result?: AssessmentAttemptResult): AssessmentAttemptGradingPolicyResult {
    if (!result) {
      return { allowed: true };
    }
    if (result.gradingStatus === AssessmentAttemptGradingStatusEnum.RELEASED) {
      return { allowed: false, reason: 'Released results cannot be regraded' };
    }
    return { allowed: true };
  }
}
