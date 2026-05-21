/**
 * AssessmentVersionStatus Value Object
 * Represents the status of an assessment version
 */

export enum AssessmentVersionStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED_SNAPSHOT = 'PUBLISHED_SNAPSHOT',
  SUPERSEDED = 'SUPERSEDED',
}

export type AssessmentVersionStatus = AssessmentVersionStatusEnum;

export const isValidAssessmentVersionStatus = (
  value: unknown,
): value is AssessmentVersionStatus => {
  return Object.values(AssessmentVersionStatusEnum).includes(value as AssessmentVersionStatusEnum);
};

export const assertValidAssessmentVersionStatus = (value: unknown): AssessmentVersionStatus => {
  if (!isValidAssessmentVersionStatus(value)) {
    throw new Error(`Invalid assessment version status: ${value}`);
  }
  return value;
};
