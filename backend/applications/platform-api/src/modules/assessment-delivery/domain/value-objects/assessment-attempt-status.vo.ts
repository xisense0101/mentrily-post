/**
 * AssessmentAttemptStatus Value Object
 * Represents the lifecycle state of a learner's assessment attempt
 */

export type AssessmentAttemptStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'EXPIRED'
  | 'CANCELLED';

export const AssessmentAttemptStatusEnum = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const satisfies Record<AssessmentAttemptStatus, AssessmentAttemptStatus>;

const validStatuses = new Set<string>(Object.values(AssessmentAttemptStatusEnum));

export function isValidAssessmentAttemptStatus(value: string): value is AssessmentAttemptStatus {
  return validStatuses.has(value);
}

export function assertValidAssessmentAttemptStatus(value: string): AssessmentAttemptStatus {
  if (!isValidAssessmentAttemptStatus(value)) {
    throw new Error(`Invalid AssessmentAttemptStatus: "${value}"`);
  }
  return value;
}
