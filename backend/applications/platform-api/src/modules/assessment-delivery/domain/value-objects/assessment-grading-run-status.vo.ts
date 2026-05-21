export type AssessmentGradingRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export const AssessmentGradingRunStatusEnum = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
} as const satisfies Record<AssessmentGradingRunStatus, AssessmentGradingRunStatus>;

const validStatuses = new Set<string>(Object.values(AssessmentGradingRunStatusEnum));

export function isValidAssessmentGradingRunStatus(
  value: string,
): value is AssessmentGradingRunStatus {
  return validStatuses.has(value);
}

export function assertValidAssessmentGradingRunStatus(value: string): AssessmentGradingRunStatus {
  if (!isValidAssessmentGradingRunStatus(value)) {
    throw new Error(`Invalid AssessmentGradingRunStatus: "${value}"`);
  }
  return value;
}
