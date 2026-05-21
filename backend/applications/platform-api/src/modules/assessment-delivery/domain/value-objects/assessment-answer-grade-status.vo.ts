export type AssessmentAnswerGradeStatus =
  | 'NOT_GRADED'
  | 'AUTO_GRADED'
  | 'PENDING_MANUAL_REVIEW'
  | 'MANUALLY_GRADED'
  | 'GRADING_SKIPPED'
  | 'GRADING_FAILED';

export const AssessmentAnswerGradeStatusEnum = {
  NOT_GRADED: 'NOT_GRADED',
  AUTO_GRADED: 'AUTO_GRADED',
  PENDING_MANUAL_REVIEW: 'PENDING_MANUAL_REVIEW',
  MANUALLY_GRADED: 'MANUALLY_GRADED',
  GRADING_SKIPPED: 'GRADING_SKIPPED',
  GRADING_FAILED: 'GRADING_FAILED',
} as const satisfies Record<AssessmentAnswerGradeStatus, AssessmentAnswerGradeStatus>;

const validStatuses = new Set<string>(Object.values(AssessmentAnswerGradeStatusEnum));

export function isValidAssessmentAnswerGradeStatus(
  value: string,
): value is AssessmentAnswerGradeStatus {
  return validStatuses.has(value);
}

export function assertValidAssessmentAnswerGradeStatus(value: string): AssessmentAnswerGradeStatus {
  if (!isValidAssessmentAnswerGradeStatus(value)) {
    throw new Error(`Invalid AssessmentAnswerGradeStatus: "${value}"`);
  }
  return value;
}
