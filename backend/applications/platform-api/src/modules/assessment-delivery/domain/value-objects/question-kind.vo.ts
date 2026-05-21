/**
 * QuestionKind Value Object
 * Represents the type of question in an assessment
 */

export enum QuestionKindEnum {
  MCQ = 'MCQ',
  MULTI_SELECT = 'MULTI_SELECT',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  LONG_ANSWER = 'LONG_ANSWER',
  CODE = 'CODE',
  NOTEBOOK = 'NOTEBOOK',
  READING_PASSAGE = 'READING_PASSAGE',
  FILE_UPLOAD = 'FILE_UPLOAD',
  RUBRIC_ONLY = 'RUBRIC_ONLY',
}

export type QuestionKind = QuestionKindEnum;

export const isValidQuestionKind = (value: unknown): value is QuestionKind => {
  return Object.values(QuestionKindEnum).includes(value as QuestionKindEnum);
};

export const assertValidQuestionKind = (value: unknown): QuestionKind => {
  if (!isValidQuestionKind(value)) {
    throw new Error(`Invalid question kind: ${value}`);
  }
  return value;
};

/**
 * Questions that support automatic grading
 */
export const autoGradeableQuestionKinds = new Set<QuestionKind>([
  QuestionKindEnum.MCQ,
  QuestionKindEnum.MULTI_SELECT,
  QuestionKindEnum.TRUE_FALSE,
  QuestionKindEnum.SHORT_ANSWER,
]);

/**
 * Questions that require manual grading
 */
export const manualGradeableQuestionKinds = new Set<QuestionKind>([
  QuestionKindEnum.LONG_ANSWER,
  QuestionKindEnum.FILE_UPLOAD,
  QuestionKindEnum.RUBRIC_ONLY,
]);

/**
 * Questions restricted to structural modeling only
 */
export const reservedRuntimeQuestionKinds = new Set<QuestionKind>([
  QuestionKindEnum.CODE,
  QuestionKindEnum.NOTEBOOK,
]);

/**
 * Check if question kind supports auto-grading
 */
export const supportsAutoGrading = (kind: QuestionKind): boolean => {
  return autoGradeableQuestionKinds.has(kind);
};

/**
 * Check if question kind requires structural validation only (reserved for runtime)
 */
export const isReservedRuntimeKind = (kind: QuestionKind): boolean => {
  return reservedRuntimeQuestionKinds.has(kind);
};
