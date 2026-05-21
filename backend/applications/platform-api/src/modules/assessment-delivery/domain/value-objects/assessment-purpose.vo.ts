/**
 * AssessmentPurpose Value Object
 * Represents the primary purpose/use case of an assessment
 */

export enum AssessmentPurposeEnum {
  QUIZ = 'QUIZ',
  EXAM = 'EXAM',
  PRACTICE = 'PRACTICE',
  ASSIGNMENT = 'ASSIGNMENT',
  PLACEMENT_TEST = 'PLACEMENT_TEST',
  CERTIFICATION = 'CERTIFICATION',
}

export type AssessmentPurpose = AssessmentPurposeEnum;

export const isValidAssessmentPurpose = (value: unknown): value is AssessmentPurpose => {
  return Object.values(AssessmentPurposeEnum).includes(value as AssessmentPurposeEnum);
};

export const assertValidAssessmentPurpose = (value: unknown): AssessmentPurpose => {
  if (!isValidAssessmentPurpose(value)) {
    throw new Error(`Invalid assessment purpose: ${value}`);
  }
  return value;
};
