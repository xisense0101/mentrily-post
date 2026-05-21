/**
 * AssessmentAttemptPolicyService
 * Domain service for enforcing attempt start and time limit policies.
 */

import type { AssessmentStatus } from '../value-objects/assessment-status.vo.js';
import { AssessmentStatusEnum } from '../value-objects/assessment-status.vo.js';
import type { AssessmentAttempt } from '../entities/assessment-attempt.entity.js';

export interface CanStartAttemptInput {
  assessmentStatus: AssessmentStatus;
  snapshotId: string | undefined;
  existingAttempts: AssessmentAttempt[];
  maxAttempts?: number | undefined;
  allowRetake: boolean;
}

export interface AttemptPolicyResult {
  allowed: boolean;
  reason?: string;
}

export class AssessmentAttemptPolicyService {
  /**
   * Determine if a learner can start a new attempt.
   */
  canStartAttempt(input: CanStartAttemptInput): AttemptPolicyResult {
    // Cannot start attempt on archived assessment
    if (input.assessmentStatus === AssessmentStatusEnum.ARCHIVED) {
      return { allowed: false, reason: 'Assessment is archived and cannot be attempted' };
    }

    // Must have a published snapshot
    if (!input.snapshotId) {
      return { allowed: false, reason: 'Assessment has no published snapshot to attempt' };
    }

    // Check for submitted attempt when retake is not allowed
    if (!input.allowRetake) {
      const hasSubmittedAttempt = input.existingAttempts.some((a) => a.isSubmitted());
      if (hasSubmittedAttempt) {
        return { allowed: false, reason: 'Retake is not allowed for this assessment' };
      }
    }

    // Enforce maxAttempts if configured
    if (input.maxAttempts !== undefined) {
      const submittedCount = input.existingAttempts.filter((a) => a.isSubmitted()).length;
      if (submittedCount >= input.maxAttempts) {
        return {
          allowed: false,
          reason: `Maximum number of attempts (${input.maxAttempts}) has been reached`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Calculate expiry time for an attempt.
   * Returns undefined for untimed assessments.
   */
  calculateExpiresAt(input: { startedAt: Date; timeLimitMinutes?: number }): Date | undefined {
    if (input.timeLimitMinutes === undefined) {
      return undefined;
    }
    return new Date(input.startedAt.getTime() + input.timeLimitMinutes * 60 * 1000);
  }
}
