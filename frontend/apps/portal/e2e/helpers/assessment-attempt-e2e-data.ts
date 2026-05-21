import { randomUUID } from 'crypto';
import type {
  AssessmentQuestionContract,
  AssessmentSectionContract,
  ReplaceAssessmentContentRequest,
} from '../../src/modules/assessment-builder/types';

function makeId(): string {
  return randomUUID();
}

function makePrompt(text: string): Record<string, unknown> {
  return { text };
}

interface AttemptQuestionSet {
  mcq: AssessmentQuestionContract;
  multiSelect: AssessmentQuestionContract;
  trueFalse: AssessmentQuestionContract;
  shortAnswer: AssessmentQuestionContract;
  longAnswer: AssessmentQuestionContract;
  code: AssessmentQuestionContract;
}

export function makeAttemptQuestionSet(): {
  content: ReplaceAssessmentContentRequest;
  questions: AttemptQuestionSet;
} {
  const mcqOptionA = makeId();
  const mcqOptionB = makeId();
  const multiOptionA = makeId();
  const multiOptionB = makeId();
  const multiOptionC = makeId();
  const trueOptionId = makeId();
  const falseOptionId = makeId();

  const mcq: AssessmentQuestionContract = {
    id: makeId(),
    kind: 'MCQ',
    title: 'MCQ question',
    prompt: makePrompt('Choose the best option.'),
    options: [
      { id: mcqOptionA, label: 'Alpha', value: 'alpha', isCorrect: false },
      { id: mcqOptionB, label: 'Bravo', value: 'bravo', isCorrect: true },
    ],
    answerKey: { correctOptionIds: [mcqOptionB] },
    points: 1,
    gradingMode: 'AUTO',
    position: 0,
  };

  const multiSelect: AssessmentQuestionContract = {
    id: makeId(),
    kind: 'MULTI_SELECT',
    title: 'Multi-select question',
    prompt: makePrompt('Select both valid options.'),
    options: [
      { id: multiOptionA, label: 'First', value: 'first', isCorrect: true },
      { id: multiOptionB, label: 'Second', value: 'second', isCorrect: true },
      { id: multiOptionC, label: 'Third', value: 'third', isCorrect: false },
    ],
    answerKey: { correctOptionIds: [multiOptionA, multiOptionB] },
    points: 2,
    gradingMode: 'MANUAL',
    position: 1,
  };

  const trueFalse: AssessmentQuestionContract = {
    id: makeId(),
    kind: 'TRUE_FALSE',
    title: 'True false question',
    prompt: makePrompt('This statement is true.'),
    options: [
      { id: trueOptionId, label: 'True', value: 'true', isCorrect: true },
      { id: falseOptionId, label: 'False', value: 'false', isCorrect: false },
    ],
    answerKey: { correctOptionIds: [trueOptionId] },
    points: 1,
    gradingMode: 'AUTO',
    position: 2,
  };

  const shortAnswer: AssessmentQuestionContract = {
    id: makeId(),
    kind: 'SHORT_ANSWER',
    title: 'Short answer question',
    prompt: makePrompt('Type a short answer.'),
    options: [],
    answerKey: { acceptedTextAnswers: ['Short answer'] },
    points: 1,
    gradingMode: 'MANUAL',
    position: 3,
  };

  const longAnswer: AssessmentQuestionContract = {
    id: makeId(),
    kind: 'LONG_ANSWER',
    title: 'Long answer question',
    prompt: makePrompt('Type a longer answer.'),
    options: [],
    answerKey: { acceptedTextAnswers: ['Long answer placeholder'] },
    points: 5,
    gradingMode: 'MANUAL',
    position: 4,
  };

  const code: AssessmentQuestionContract = {
    id: makeId(),
    kind: 'CODE',
    title: 'Code placeholder question',
    prompt: makePrompt('Write code text only.'),
    options: [],
    answerKey: { expectedOutput: 'placeholder output' },
    points: 3,
    gradingMode: 'MANUAL',
    position: 5,
  };

  const section: AssessmentSectionContract = {
    id: makeId(),
    title: 'Attempt section',
    description: 'Published section for learner runtime',
    position: 0,
    metadata: {},
    questions: [mcq],
  };

  return {
    content: {
      sections: [section],
      looseQuestions: [multiSelect, trueFalse, shortAnswer, longAnswer, code],
    },
    questions: {
      mcq,
      multiSelect,
      trueFalse,
      shortAnswer,
      longAnswer,
      code,
    },
  };
}
