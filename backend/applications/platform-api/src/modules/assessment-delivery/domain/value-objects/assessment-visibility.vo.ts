/**
 * AssessmentVisibility Value Object
 * Represents the visibility/access level of an assessment
 */

export enum AssessmentVisibilityEnum {
  PRIVATE = 'PRIVATE',
  WORKSPACE = 'WORKSPACE',
  PUBLIC_LINK = 'PUBLIC_LINK',
  INVITE_ONLY = 'INVITE_ONLY',
}

export type AssessmentVisibility = AssessmentVisibilityEnum;

export const isValidAssessmentVisibility = (value: unknown): value is AssessmentVisibility => {
  return Object.values(AssessmentVisibilityEnum).includes(value as AssessmentVisibilityEnum);
};

export const assertValidAssessmentVisibility = (value: unknown): AssessmentVisibility => {
  if (!isValidAssessmentVisibility(value)) {
    throw new Error(`Invalid assessment visibility: ${value}`);
  }
  return value;
};
