/**
 * AssessmentAttemptGradingStatus Value Object
 * Represents the grading lifecycle state of an attempt result
 *
 * NOTE: AUTO_GRADING_RESERVED and code execution grading are reserved for future tasks.
 * Manual grading queue is also reserved for future tasks.
 */

export type AssessmentAttemptGradingStatus =
  | 'NOT_GRADED'
  | 'AUTO_GRADING_RESERVED'
  | 'PENDING_MANUAL_REVIEW'
  | 'GRADED'
  | 'RELEASED';

export const AssessmentAttemptGradingStatusEnum = {
  NOT_GRADED: 'NOT_GRADED',
  AUTO_GRADING_RESERVED: 'AUTO_GRADING_RESERVED',
  PENDING_MANUAL_REVIEW: 'PENDING_MANUAL_REVIEW',
  GRADED: 'GRADED',
  RELEASED: 'RELEASED',
} as const satisfies Record<AssessmentAttemptGradingStatus, AssessmentAttemptGradingStatus>;

const validStatuses = new Set<string>(Object.values(AssessmentAttemptGradingStatusEnum));

export function isValidAssessmentAttemptGradingStatus(
  value: string,
): value is AssessmentAttemptGradingStatus {
  return validStatuses.has(value);
}

export function assertValidAssessmentAttemptGradingStatus(
  value: string,
): AssessmentAttemptGradingStatus {
  if (!isValidAssessmentAttemptGradingStatus(value)) {
    throw new Error(`Invalid AssessmentAttemptGradingStatus: "${value}"`);
  }
  return value;
}
