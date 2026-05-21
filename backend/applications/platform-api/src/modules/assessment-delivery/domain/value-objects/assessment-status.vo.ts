/**
 * AssessmentStatus Value Object
 * Represents the lifecycle status of an assessment
 */

export enum AssessmentStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export type AssessmentStatus = AssessmentStatusEnum;

export const isValidAssessmentStatus = (value: unknown): value is AssessmentStatus => {
  return Object.values(AssessmentStatusEnum).includes(value as AssessmentStatusEnum);
};

export const assertValidAssessmentStatus = (value: unknown): AssessmentStatus => {
  if (!isValidAssessmentStatus(value)) {
    throw new Error(`Invalid assessment status: ${value}`);
  }
  return value;
};
