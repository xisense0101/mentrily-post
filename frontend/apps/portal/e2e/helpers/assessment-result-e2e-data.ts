import { randomUUID } from 'node:crypto';
import type { ReplaceAssessmentContentRequest } from '../../src/contracts/assessment-delivery';

export interface AssessmentResultFixtureIds {
  mcqQuestionId: string;
  longQuestionId: string;
  optionAId: string;
  optionBId: string;
}

export function createAssessmentResultFixture(): {
  ids: AssessmentResultFixtureIds;
  content: ReplaceAssessmentContentRequest;
} {
  const ids: AssessmentResultFixtureIds = {
    mcqQuestionId: randomUUID(),
    longQuestionId: randomUUID(),
    optionAId: randomUUID(),
    optionBId: randomUUID(),
  };

  return {
    ids,
    content: {
      sections: [],
      looseQuestions: [
        {
          id: ids.mcqQuestionId,
          kind: 'MCQ',
          title: 'MCQ question',
          prompt: { text: 'Pick A' },
          options: [
            { id: ids.optionAId, label: 'A', value: 'a', isCorrect: true },
            { id: ids.optionBId, label: 'B', value: 'b', isCorrect: false },
          ],
          answerKey: { correctOptionIds: [ids.optionAId] },
          points: 1,
          gradingMode: 'AUTO',
          position: 0,
        },
        {
          id: ids.longQuestionId,
          kind: 'LONG_ANSWER',
          title: 'Explain reasoning',
          prompt: { text: 'Explain your answer' },
          options: [],
          points: 3,
          gradingMode: 'MANUAL',
          position: 1,
        },
      ],
    },
  };
}
