/**
 * AssessmentAttemptAnswerStatus Value Object
 * Represents the state of a single learner answer within an attempt
 */

export type AssessmentAttemptAnswerStatus = 'DRAFT' | 'SUBMITTED';

export const AssessmentAttemptAnswerStatusEnum = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
} as const satisfies Record<AssessmentAttemptAnswerStatus, AssessmentAttemptAnswerStatus>;

const validStatuses = new Set<string>(Object.values(AssessmentAttemptAnswerStatusEnum));

export function isValidAssessmentAttemptAnswerStatus(
  value: string,
): value is AssessmentAttemptAnswerStatus {
  return validStatuses.has(value);
}

export function assertValidAssessmentAttemptAnswerStatus(
  value: string,
): AssessmentAttemptAnswerStatus {
  if (!isValidAssessmentAttemptAnswerStatus(value)) {
    throw new Error(`Invalid AssessmentAttemptAnswerStatus: "${value}"`);
  }
  return value;
}
