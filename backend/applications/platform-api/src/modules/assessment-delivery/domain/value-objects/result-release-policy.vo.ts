/**
 * ResultReleasePolicy Value Object
 * Represents when assessment results are released to learners
 */

export enum ResultReleasePolicyEnum {
  IMMEDIATE = 'IMMEDIATE',
  AFTER_DUE_DATE = 'AFTER_DUE_DATE',
  AFTER_MANUAL_REVIEW = 'AFTER_MANUAL_REVIEW',
  MANUAL_RELEASE = 'MANUAL_RELEASE',
}

export type ResultReleasePolicy = ResultReleasePolicyEnum;

export const isValidResultReleasePolicy = (value: unknown): value is ResultReleasePolicy => {
  return Object.values(ResultReleasePolicyEnum).includes(value as ResultReleasePolicyEnum);
};

export const assertValidResultReleasePolicy = (value: unknown): ResultReleasePolicy => {
  if (!isValidResultReleasePolicy(value)) {
    throw new Error(`Invalid result release policy: ${value}`);
  }
  return value;
};
