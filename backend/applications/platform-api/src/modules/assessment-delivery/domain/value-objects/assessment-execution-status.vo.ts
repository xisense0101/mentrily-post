export type AssessmentExecutionStatus =
  | 'NOT_REQUESTED'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'CANCELLED'
  | 'PROVIDER_UNAVAILABLE'
  | 'RESERVED';

export const AssessmentExecutionStatusEnum = {
  NOT_REQUESTED: 'NOT_REQUESTED',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  TIMED_OUT: 'TIMED_OUT',
  CANCELLED: 'CANCELLED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  RESERVED: 'RESERVED',
} as const satisfies Record<AssessmentExecutionStatus, AssessmentExecutionStatus>;

const validStatuses = new Set<string>(Object.values(AssessmentExecutionStatusEnum));

export function isValidAssessmentExecutionStatus(
  value: string,
): value is AssessmentExecutionStatus {
  return validStatuses.has(value);
}

export function assertValidAssessmentExecutionStatus(value: string): AssessmentExecutionStatus {
  if (!isValidAssessmentExecutionStatus(value)) {
    throw new Error(`Invalid AssessmentExecutionStatus: "${value}"`);
  }
  return value;
}
