import type { ReplaceAssessmentContentRequest } from '../../src/contracts/assessment-delivery';

export function makeManualReviewAssessmentContent(): ReplaceAssessmentContentRequest {
  return {
    sections: [],
    looseQuestions: [
      {
        id: crypto.randomUUID(),
        kind: 'MCQ',
        title: 'Auto question',
        prompt: { text: '2 + 2' },
        options: [
          { id: 'o1', label: '4', value: '4', isCorrect: true },
          { id: 'o2', label: '5', value: '5', isCorrect: false },
        ],
        answerKey: { correctOptionIds: ['o1'] },
        points: 1,
        gradingMode: 'AUTO',
        position: 0,
      },
      {
        id: crypto.randomUUID(),
        kind: 'LONG_ANSWER',
        title: 'Manual question',
        prompt: { text: 'Explain your approach.' },
        options: [],
        points: 3,
        gradingMode: 'MANUAL',
        position: 1,
      },
    ],
  };
}
