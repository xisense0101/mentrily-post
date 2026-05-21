export type AssessmentExecutionKind = 'CODE' | 'NOTEBOOK';

export const AssessmentExecutionKindEnum = {
  CODE: 'CODE',
  NOTEBOOK: 'NOTEBOOK',
} as const satisfies Record<AssessmentExecutionKind, AssessmentExecutionKind>;

const validKinds = new Set<string>(Object.values(AssessmentExecutionKindEnum));

export function isValidAssessmentExecutionKind(value: string): value is AssessmentExecutionKind {
  return validKinds.has(value);
}

export function assertValidAssessmentExecutionKind(value: string): AssessmentExecutionKind {
  if (!isValidAssessmentExecutionKind(value)) {
    throw new Error(`Invalid AssessmentExecutionKind: "${value}"`);
  }
  return value;
}
