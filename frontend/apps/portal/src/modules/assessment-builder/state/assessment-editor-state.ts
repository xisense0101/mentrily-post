import type {
  AssessmentQuestionContract,
  AssessmentQuestionKindContract,
  AssessmentSectionContract,
  GradingRubricContract,
  GradingRuleContract,
  QuestionAnswerKeyContract,
  ReplaceAssessmentContentRequest,
} from '../types';

function createLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Section helpers ────────────────────────────────────────────────

export function createEmptySection(input: {
  assessmentId: string;
  position: number;
  title?: string | undefined;
}): AssessmentSectionContract {
  return {
    id: createLocalId(),
    title: input.title ?? 'New section',
    description: undefined,
    position: input.position,
    metadata: { assessmentId: input.assessmentId, local: true },
    questions: [],
  };
}

export function normalizeSectionPositions(
  sections: AssessmentSectionContract[],
): AssessmentSectionContract[] {
  return [...sections]
    .sort((a, b) => a.position - b.position)
    .map((section, index) => ({
      ...section,
      position: index,
      questions: normalizeQuestionPositions(section.questions),
    }));
}

export function appendSection(input: {
  sections: AssessmentSectionContract[];
  section: AssessmentSectionContract;
}): AssessmentSectionContract[] {
  return normalizeSectionPositions([...input.sections, input.section]);
}

export function updateSection(input: {
  sections: AssessmentSectionContract[];
  sectionId: string;
  patch: Partial<Pick<AssessmentSectionContract, 'title' | 'description' | 'metadata'>>;
}): AssessmentSectionContract[] {
  return input.sections.map((section) =>
    section.id === input.sectionId ? { ...section, ...input.patch } : section,
  );
}

export function removeSection(input: {
  sections: AssessmentSectionContract[];
  sectionId: string;
}): AssessmentSectionContract[] {
  return normalizeSectionPositions(
    input.sections.filter((section) => section.id !== input.sectionId),
  );
}

// ─── Question helpers ────────────────────────────────────────────────

function createQuestion(input: {
  assessmentId: string;
  sectionId?: string | undefined;
  position: number;
  title: string;
  kind: AssessmentQuestionKindContract;
  options?: Array<Record<string, unknown>> | undefined;
  answerKey?: QuestionAnswerKeyContract | undefined;
  gradingMode?: AssessmentQuestionContract['gradingMode'] | undefined;
  points?: number | undefined;
}): AssessmentQuestionContract {
  return {
    id: createLocalId(),
    sectionId: input.sectionId,
    kind: input.kind,
    title: input.title,
    prompt: { text: '' },
    options: input.options ?? [],
    answerKey: input.answerKey,
    points: input.points ?? 1,
    gradingMode: input.gradingMode ?? 'AUTO',
    position: input.position,
    metadata: { assessmentId: input.assessmentId, local: true },
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stripEmptyAnswerKey(
  answerKey: QuestionAnswerKeyContract | undefined,
): QuestionAnswerKeyContract | undefined {
  if (!answerKey) {
    return undefined;
  }

  const normalized: QuestionAnswerKeyContract = {};
  let hasConcreteAnswerSpec = false;

  if (Array.isArray(answerKey.correctOptionIds) && answerKey.correctOptionIds.length > 0) {
    normalized.correctOptionIds = answerKey.correctOptionIds;
    hasConcreteAnswerSpec = true;
  }

  if (Array.isArray(answerKey.acceptedTextAnswers) && answerKey.acceptedTextAnswers.length > 0) {
    normalized.acceptedTextAnswers = answerKey.acceptedTextAnswers;
    hasConcreteAnswerSpec = true;
  }

  if (isNonEmptyString(answerKey.expectedOutput)) {
    normalized.expectedOutput = answerKey.expectedOutput.trim();
    hasConcreteAnswerSpec = true;
  }

  if (isNonEmptyString(answerKey.rubricId)) {
    normalized.rubricId = answerKey.rubricId.trim();
    hasConcreteAnswerSpec = true;
  }

  if (hasConcreteAnswerSpec && answerKey.metadata && Object.keys(answerKey.metadata).length > 0) {
    normalized.metadata = answerKey.metadata;
  }

  return hasConcreteAnswerSpec ? normalized : undefined;
}

export function createMcqQuestion(input: {
  assessmentId: string;
  sectionId?: string | undefined;
  position: number;
  title?: string | undefined;
}): AssessmentQuestionContract {
  return createQuestion({
    ...input,
    title: input.title ?? 'New MCQ question',
    kind: 'MCQ',
    options: [
      { id: createLocalId(), label: 'Option A', value: 'a', isCorrect: false },
      { id: createLocalId(), label: 'Option B', value: 'b', isCorrect: false },
    ],
  });
}

export function createMultiSelectQuestion(input: {
  assessmentId: string;
  sectionId?: string | undefined;
  position: number;
  title?: string | undefined;
}): AssessmentQuestionContract {
  return createQuestion({
    ...input,
    title: input.title ?? 'New multi-select question',
    kind: 'MULTI_SELECT',
    options: [
      { id: createLocalId(), label: 'Option A', value: 'a', isCorrect: false },
      { id: createLocalId(), label: 'Option B', value: 'b', isCorrect: false },
    ],
  });
}

export function createTrueFalseQuestion(input: {
  assessmentId: string;
  sectionId?: string | undefined;
  position: number;
  title?: string | undefined;
}): AssessmentQuestionContract {
  return createQuestion({
    ...input,
    title: input.title ?? 'New true/false question',
    kind: 'TRUE_FALSE',
    options: [
      { id: createLocalId(), label: 'True', value: 'true', isCorrect: false },
      { id: createLocalId(), label: 'False', value: 'false', isCorrect: false },
    ],
  });
}

export function createShortAnswerQuestion(input: {
  assessmentId: string;
  sectionId?: string | undefined;
  position: number;
  title?: string | undefined;
}): AssessmentQuestionContract {
  return createQuestion({
    ...input,
    title: input.title ?? 'New short answer question',
    kind: 'SHORT_ANSWER',
    options: [],
  });
}

export function createLongAnswerQuestion(input: {
  assessmentId: string;
  sectionId?: string | undefined;
  position: number;
  title?: string | undefined;
}): AssessmentQuestionContract {
  return createQuestion({
    ...input,
    title: input.title ?? 'New long answer question',
    kind: 'LONG_ANSWER',
    gradingMode: 'MANUAL',
    options: [],
  });
}

export function createCodeQuestionPlaceholder(input: {
  assessmentId: string;
  sectionId?: string | undefined;
  position: number;
  title?: string | undefined;
}): AssessmentQuestionContract {
  return createQuestion({
    ...input,
    title: input.title ?? 'New code question (placeholder)',
    kind: 'CODE',
    gradingMode: 'MANUAL',
    options: [],
  });
}

export function createReadingPassageQuestion(input: {
  assessmentId: string;
  sectionId?: string | undefined;
  position: number;
  title?: string | undefined;
}): AssessmentQuestionContract {
  return createQuestion({
    ...input,
    title: input.title ?? 'New reading passage',
    kind: 'READING_PASSAGE',
    gradingMode: 'MANUAL',
    points: 0,
    options: [],
  });
}

export function createFileUploadQuestion(input: {
  assessmentId: string;
  sectionId?: string | undefined;
  position: number;
  title?: string | undefined;
}): AssessmentQuestionContract {
  return createQuestion({
    ...input,
    title: input.title ?? 'New file upload question',
    kind: 'FILE_UPLOAD',
    gradingMode: 'MANUAL',
    options: [],
  });
}

export function normalizeQuestionPositions(
  questions: AssessmentQuestionContract[],
): AssessmentQuestionContract[] {
  return [...questions]
    .sort((a, b) => a.position - b.position)
    .map((q, index) => ({ ...q, position: index }));
}

export function appendQuestionToSection(input: {
  sections: AssessmentSectionContract[];
  sectionId: string;
  question: AssessmentQuestionContract;
}): AssessmentSectionContract[] {
  return input.sections.map((section) => {
    if (section.id !== input.sectionId) return section;

    const nextQuestions = normalizeQuestionPositions([
      ...section.questions,
      { ...input.question, sectionId: section.id },
    ]);

    return { ...section, questions: nextQuestions };
  });
}

export function appendLooseQuestion(input: {
  questions: AssessmentQuestionContract[];
  question: AssessmentQuestionContract;
}): AssessmentQuestionContract[] {
  return normalizeQuestionPositions([...input.questions, input.question]);
}

export function updateQuestion(input: {
  sections: AssessmentSectionContract[];
  looseQuestions: AssessmentQuestionContract[];
  questionId: string;
  patch: Partial<AssessmentQuestionContract>;
}): {
  sections: AssessmentSectionContract[];
  looseQuestions: AssessmentQuestionContract[];
} {
  const sections = input.sections.map((section) => ({
    ...section,
    questions: section.questions.map((q) =>
      q.id === input.questionId ? { ...q, ...input.patch } : q,
    ),
  }));

  const looseQuestions = input.looseQuestions.map((q) =>
    q.id === input.questionId ? { ...q, ...input.patch } : q,
  );

  return { sections, looseQuestions };
}

export function removeQuestion(input: {
  sections: AssessmentSectionContract[];
  looseQuestions: AssessmentQuestionContract[];
  questionId: string;
}): {
  sections: AssessmentSectionContract[];
  looseQuestions: AssessmentQuestionContract[];
} {
  const sections = input.sections.map((section) => ({
    ...section,
    questions: normalizeQuestionPositions(
      section.questions.filter((q) => q.id !== input.questionId),
    ),
  }));

  const looseQuestions = normalizeQuestionPositions(
    input.looseQuestions.filter((q) => q.id !== input.questionId),
  );

  return { sections, looseQuestions };
}

export function toReplaceAssessmentContentRequest(input: {
  sections: AssessmentSectionContract[];
  looseQuestions: AssessmentQuestionContract[];
  gradingRubrics: GradingRubricContract[];
  gradingRules: GradingRuleContract[];
}): ReplaceAssessmentContentRequest {
  const sections = normalizeSectionPositions(input.sections).map((section) => ({
    ...section,
    questions: normalizeQuestionPositions(section.questions).map((question) => ({
      ...question,
      answerKey: stripEmptyAnswerKey(question.answerKey),
    })),
  }));

  const looseQuestions = normalizeQuestionPositions(input.looseQuestions).map((question) => ({
    ...question,
    answerKey: stripEmptyAnswerKey(question.answerKey),
  }));

  return {
    sections,
    looseQuestions,
    gradingRubrics: input.gradingRubrics,
    gradingRules: input.gradingRules,
  };
}
