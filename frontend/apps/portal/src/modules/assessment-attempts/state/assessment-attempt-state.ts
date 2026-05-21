import type {
  AssessmentAttemptAnswerContract,
  AssessmentAttemptContract,
  AssessmentPublishedSnapshotContract,
  AssessmentQuestionContract,
  AssessmentQuestionKindContract,
} from '../types';

interface CodeAnswerValue {
  sourceCode?: string | undefined;
  language?: string | undefined;
}

const NON_ANSWERABLE_QUESTION_KINDS = new Set<AssessmentQuestionKindContract>(['READING_PASSAGE']);

const PLACEHOLDER_QUESTION_KINDS = new Set<AssessmentQuestionKindContract>(['FILE_UPLOAD']);

export type AttemptTimerSeverity = 'normal' | 'warning' | 'urgent' | 'expired';

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function toAnswerPayload(input: {
  questionKind: AssessmentQuestionKindContract;
  value: unknown;
}): Record<string, unknown> {
  switch (input.questionKind) {
    case 'MCQ':
      return { selectedOptionId: typeof input.value === 'string' ? input.value : '' };
    case 'MULTI_SELECT':
      return { selectedOptionIds: asStringArray(input.value) };
    case 'TRUE_FALSE':
      return { value: Boolean(input.value) };
    case 'SHORT_ANSWER':
    case 'LONG_ANSWER':
      return { text: typeof input.value === 'string' ? input.value : '' };
    case 'CODE': {
      if (typeof input.value === 'string') {
        return { sourceCode: input.value };
      }

      const codeValue =
        typeof input.value === 'object' && input.value !== null
          ? (input.value as CodeAnswerValue)
          : undefined;

      return {
        sourceCode: typeof codeValue?.sourceCode === 'string' ? codeValue.sourceCode : '',
        ...(typeof codeValue?.language === 'string' ? { language: codeValue.language } : {}),
      };
    }
    case 'NOTEBOOK':
      return { notebookJson: input.value };
    case 'FILE_UPLOAD':
      return { fileIds: asStringArray(input.value) };
    case 'RUBRIC_ONLY':
    case 'READING_PASSAGE':
      return {};
  }
}

export function isQuestionAnswerable(kind: AssessmentQuestionKindContract): boolean {
  return !NON_ANSWERABLE_QUESTION_KINDS.has(kind);
}

export function isPlaceholderQuestionKind(kind: AssessmentQuestionKindContract): boolean {
  return PLACEHOLDER_QUESTION_KINDS.has(kind);
}

export function isSupportedAttemptQuestionKind(
  kind: string,
): kind is AssessmentQuestionKindContract {
  return [
    'MCQ',
    'MULTI_SELECT',
    'TRUE_FALSE',
    'SHORT_ANSWER',
    'LONG_ANSWER',
    'CODE',
    'NOTEBOOK',
    'READING_PASSAGE',
    'FILE_UPLOAD',
    'RUBRIC_ONLY',
  ].includes(kind);
}

export function findAnswerForQuestion(input: {
  attempt: AssessmentAttemptContract;
  questionId: string;
}): AssessmentAttemptAnswerContract | undefined {
  return input.attempt.answers.find((answer) => answer.questionId === input.questionId);
}

export function upsertLocalDraftAnswer(input: {
  answers: AssessmentAttemptAnswerContract[];
  answer: AssessmentAttemptAnswerContract;
}): AssessmentAttemptAnswerContract[] {
  const index = input.answers.findIndex(
    (existing) =>
      existing.id === input.answer.id || existing.questionId === input.answer.questionId,
  );

  if (index === -1) {
    return [...input.answers, input.answer];
  }

  const nextAnswers = [...input.answers];
  nextAnswers[index] = input.answer;
  return nextAnswers;
}

export function isAttemptSubmitted(attempt: AssessmentAttemptContract): boolean {
  return attempt.status === 'SUBMITTED';
}

export function isAttemptExpired(
  attempt: AssessmentAttemptContract,
  now: Date = new Date(),
): boolean {
  if (attempt.status === 'EXPIRED') {
    return true;
  }

  return typeof attempt.expiresAt === 'string'
    ? new Date(attempt.expiresAt).getTime() <= now.getTime()
    : false;
}

export function isAttemptEditable(attempt: AssessmentAttemptContract): boolean {
  if (attempt.status !== 'IN_PROGRESS' && attempt.status !== 'NOT_STARTED') {
    return false;
  }

  return !isAttemptExpired(attempt);
}

export function getAttemptExpiresAt(attempt: AssessmentAttemptContract): string | undefined {
  return attempt.expiresAt ?? attempt.session.expiresAt;
}

export function getRemainingTimeMs(
  attempt: AssessmentAttemptContract,
  now: Date = new Date(),
): number | null {
  const expiresAt = getAttemptExpiresAt(attempt);

  if (!expiresAt) {
    return null;
  }

  return new Date(expiresAt).getTime() - now.getTime();
}

export function getTimerSeverity(
  attempt: AssessmentAttemptContract,
  now: Date = new Date(),
): AttemptTimerSeverity | null {
  const remainingMs = getRemainingTimeMs(attempt, now);

  if (remainingMs === null) {
    return null;
  }

  if (remainingMs <= 0) {
    return 'expired';
  }

  if (remainingMs <= 60_000) {
    return 'urgent';
  }

  if (remainingMs <= 5 * 60_000) {
    return 'warning';
  }

  return 'normal';
}

function isNonEmptyAnswer(answer: Record<string, unknown>): boolean {
  if ('selectedOptionId' in answer) {
    return typeof answer.selectedOptionId === 'string' && answer.selectedOptionId.length > 0;
  }

  if ('selectedOptionIds' in answer) {
    return Array.isArray(answer.selectedOptionIds) && answer.selectedOptionIds.length > 0;
  }

  if ('value' in answer) {
    return typeof answer.value === 'boolean';
  }

  if ('text' in answer) {
    return typeof answer.text === 'string' && answer.text.trim().length > 0;
  }

  if ('sourceCode' in answer) {
    return typeof answer.sourceCode === 'string' && answer.sourceCode.trim().length > 0;
  }

  if ('fileIds' in answer) {
    return Array.isArray(answer.fileIds) && answer.fileIds.length > 0;
  }

  if ('notebookJson' in answer) {
    return answer.notebookJson !== null && answer.notebookJson !== undefined;
  }

  return Object.keys(answer).length > 0;
}

export function countAnsweredQuestions(input: {
  questions: AssessmentQuestionContract[];
  answers: AssessmentAttemptAnswerContract[];
}): number {
  const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer.answer]));

  return input.questions.reduce((count, question) => {
    if (!isQuestionAnswerable(question.kind)) {
      return count;
    }

    const answer = answerMap.get(question.id);
    return answer && isNonEmptyAnswer(answer) ? count + 1 : count;
  }, 0);
}

export function countAnswerableQuestions(questions: AssessmentQuestionContract[]): number {
  return questions.filter((question) => isQuestionAnswerable(question.kind)).length;
}

export function flattenSnapshotQuestions(
  snapshot: AssessmentPublishedSnapshotContract,
): AssessmentQuestionContract[] {
  const sectionQuestions = [...snapshot.sections]
    .sort((left, right) => left.position - right.position)
    .flatMap((section) =>
      [...section.questions]
        .sort((left, right) => left.position - right.position)
        .map((question) => ({
          ...question,
          sectionId: question.sectionId ?? section.id,
        })),
    );

  const looseQuestions = [...snapshot.looseQuestions].sort(
    (left, right) => left.position - right.position,
  );

  return [...sectionQuestions, ...looseQuestions];
}
