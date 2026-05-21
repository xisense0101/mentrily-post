export type AssessmentExecutionLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'go'
  | 'rust';

export const AssessmentExecutionLanguageEnum = {
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
  PYTHON: 'python',
  JAVA: 'java',
  CPP: 'cpp',
  C: 'c',
  GO: 'go',
  RUST: 'rust',
} as const satisfies Record<string, AssessmentExecutionLanguage>;

const validLanguages = new Set<string>(Object.values(AssessmentExecutionLanguageEnum));

export function isValidAssessmentExecutionLanguage(
  value: string,
): value is AssessmentExecutionLanguage {
  return value.length > 0 && validLanguages.has(value);
}

export function assertValidAssessmentExecutionLanguage(value: string): AssessmentExecutionLanguage {
  if (!isValidAssessmentExecutionLanguage(value)) {
    throw new Error(`Invalid AssessmentExecutionLanguage: "${value}"`);
  }
  return value;
}
