export type AssessmentGradingMethod =
  | 'AUTO_RULE'
  | 'MANUAL_REVIEW'
  | 'CODE_EXECUTION_RESERVED'
  | 'AI_RESERVED';

export const AssessmentGradingMethodEnum = {
  AUTO_RULE: 'AUTO_RULE',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  CODE_EXECUTION_RESERVED: 'CODE_EXECUTION_RESERVED',
  AI_RESERVED: 'AI_RESERVED',
} as const satisfies Record<AssessmentGradingMethod, AssessmentGradingMethod>;

const validMethods = new Set<string>(Object.values(AssessmentGradingMethodEnum));

export function isValidAssessmentGradingMethod(value: string): value is AssessmentGradingMethod {
  return validMethods.has(value);
}

export function assertValidAssessmentGradingMethod(value: string): AssessmentGradingMethod {
  if (!isValidAssessmentGradingMethod(value)) {
    throw new Error(`Invalid AssessmentGradingMethod: "${value}"`);
  }
  return value;
}
