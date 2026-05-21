import { randomUUID } from 'crypto';
import type {
  AssessmentContract,
  AssessmentSectionContract,
  AssessmentQuestionContract,
  CreateAssessmentRequest,
  ReplaceAssessmentContentRequest,
} from '../../src/modules/assessment-builder/types';

function makeTimestamp(): number {
  return Date.now();
}

function makeId(): string {
  return randomUUID();
}

export function makeAssessmentInput(title?: string): CreateAssessmentRequest {
  const timestamp = makeTimestamp();
  const finalTitle = title ?? `E2E Assessment ${timestamp}`;

  return {
    title: finalTitle,
    purpose: 'QUIZ',
    visibility: 'PRIVATE',
    description: `E2E assessment created at ${timestamp}`,
  };
}

export function makeMcqQuestionInput(position = 0): AssessmentQuestionContract {
  const timestamp = makeTimestamp();
  const optionAId = makeId();
  const optionBId = makeId();
  const optionCId = makeId();

  return {
    id: makeId(),
    kind: 'MCQ',
    title: `E2E MCQ Question ${timestamp}`,
    prompt: { text: 'Which of the following is correct?' },
    points: 1,
    gradingMode: 'AUTO',
    options: [
      { id: optionAId, label: 'Option A', value: 'A', isCorrect: false },
      { id: optionBId, label: 'Option B', value: 'B', isCorrect: true },
      { id: optionCId, label: 'Option C', value: 'C', isCorrect: false },
    ],
    answerKey: {
      correctOptionIds: [optionBId],
      metadata: {},
    },
    position,
  };
}

export function makeMultiSelectQuestionInput(position = 0): AssessmentQuestionContract {
  const timestamp = makeTimestamp();
  const option1Id = makeId();
  const option2Id = makeId();
  const option3Id = makeId();

  return {
    id: makeId(),
    kind: 'MULTI_SELECT',
    title: `E2E Multi-Select Question ${timestamp}`,
    prompt: { text: 'Select all correct answers:' },
    points: 2,
    gradingMode: 'MANUAL',
    options: [
      { id: option1Id, label: 'Answer 1', value: '1', isCorrect: true },
      { id: option2Id, label: 'Answer 2', value: '2', isCorrect: true },
      { id: option3Id, label: 'Answer 3', value: '3', isCorrect: false },
    ],
    answerKey: {
      correctOptionIds: [option1Id, option2Id],
      metadata: {},
    },
    position,
  };
}

export function makeTrueFalseQuestionInput(position = 0): AssessmentQuestionContract {
  const timestamp = makeTimestamp();
  const trueId = makeId();
  const falseId = makeId();

  return {
    id: makeId(),
    kind: 'TRUE_FALSE',
    title: `E2E True/False Question ${timestamp}`,
    prompt: { text: 'Is this statement true?' },
    points: 1,
    gradingMode: 'AUTO',
    options: [
      { id: trueId, label: 'True', value: 'true', isCorrect: true },
      { id: falseId, label: 'False', value: 'false', isCorrect: false },
    ],
    answerKey: {
      correctOptionIds: [trueId],
      metadata: {},
    },
    position,
  };
}

export function makeShortAnswerQuestionInput(position = 0): AssessmentQuestionContract {
  const timestamp = makeTimestamp();

  return {
    id: makeId(),
    kind: 'SHORT_ANSWER',
    title: `E2E Short Answer Question ${timestamp}`,
    prompt: { text: 'What is the capital of France?' },
    points: 1,
    gradingMode: 'MANUAL',
    options: [],
    answerKey: {
      acceptedTextAnswers: ['Paris', 'paris'],
      metadata: {},
    },
    position,
  };
}

export function makeLongAnswerQuestionInput(position = 0): AssessmentQuestionContract {
  const timestamp = makeTimestamp();

  return {
    id: makeId(),
    kind: 'LONG_ANSWER',
    title: `E2E Long Answer Question ${timestamp}`,
    prompt: { text: 'Explain the concept of photosynthesis.' },
    points: 5,
    gradingMode: 'MANUAL',
    options: [],
    answerKey: {
      metadata: {},
    },
    position,
  };
}

export function makeCodePlaceholderQuestionInput(position = 0): AssessmentQuestionContract {
  const timestamp = makeTimestamp();

  return {
    id: makeId(),
    kind: 'CODE',
    title: `E2E Code Question ${timestamp}`,
    prompt: { text: 'Write a function to sum two numbers.' },
    points: 3,
    gradingMode: 'MANUAL',
    options: [],
    answerKey: {
      metadata: {},
    },
    position,
  };
}

export function makeAssessmentSectionInput(title: string, position = 0): AssessmentSectionContract {
  return {
    id: randomUUID(),
    title,
    position,
    questions: [],
  };
}

export function makeAssessmentContentInput(
  sections: AssessmentSectionContract[],
): ReplaceAssessmentContentRequest {
  return {
    sections,
    looseQuestions: [],
  };
}

export function getAssessmentId(assessment: AssessmentContract): string {
  return assessment.id;
}
