/**
 * GradingMode Value Object
 * Represents how a question or assessment is graded
 */

export enum GradingModeEnum {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
  HYBRID = 'HYBRID',
}

export type GradingMode = GradingModeEnum;

export const isValidGradingMode = (value: unknown): value is GradingMode => {
  return Object.values(GradingModeEnum).includes(value as GradingModeEnum);
};

export const assertValidGradingMode = (value: unknown): GradingMode => {
  if (!isValidGradingMode(value)) {
    throw new Error(`Invalid grading mode: ${value}`);
  }
  return value;
};
