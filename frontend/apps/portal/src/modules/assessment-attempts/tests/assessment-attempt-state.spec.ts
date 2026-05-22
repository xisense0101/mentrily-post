import { describe, expect, it } from 'vitest';
import {
  countAnsweredQuestions,
  countAnswerableQuestions,
  findAnswerForQuestion,
  flattenSnapshotQuestions,
  getTimerSeverity,
  isAttemptEditable,
  isAttemptExpired,
  isAttemptSubmitted,
  isQuestionAnswerable,
  toAnswerPayload,
  upsertLocalDraftAnswer,
} from '../state';
import type {
  AssessmentAttemptAnswerContract,
  AssessmentAttemptContract,
  AssessmentPublishedSnapshotContract,
  AssessmentQuestionContract,
} from '../types';

const questions: AssessmentQuestionContract[] = [
  {
    id: 'q1',
    kind: 'MCQ',
    title: 'MCQ',
    prompt: { text: 'prompt' },
    options: [],
    points: 1,
    gradingMode: 'AUTO',
    position: 0,
  },
  {
    id: 'q2',
    kind: 'SHORT_ANSWER',
    title: 'Short',
    prompt: { text: 'prompt' },
    options: [],
    points: 1,
    gradingMode: 'MANUAL',
    position: 1,
  },
  {
    id: 'q3',
    kind: 'READING_PASSAGE',
    title: 'Passage',
    prompt: { text: 'Read first', passageBody: 'Body' },
    options: [],
    points: 0,
    gradingMode: 'MANUAL',
    position: 2,
  },
];

const attempt: AssessmentAttemptContract = {
  id: 'attempt-1',
  assessmentId: 'assessment-1',
  snapshotId: 'snapshot-1',
  snapshotVersionNumber: 1,
  learnerPrincipalId: 'learner-1',
  status: 'IN_PROGRESS',
  session: {
    id: 'session-1',
    startedAt: '2026-05-17T00:00:00.000Z',
    lastSeenAt: '2026-05-17T00:00:00.000Z',
  },
  answers: [],
  metadata: {},
  startedAt: '2026-05-17T00:00:00.000Z',
  createdAt: '2026-05-17T00:00:00.000Z',
  updatedAt: '2026-05-17T00:00:00.000Z',
};

describe('assessment-attempt-state', () => {
  it('flattens snapshot questions in order', () => {
    const snapshot: AssessmentPublishedSnapshotContract = {
      id: 'snapshot-1',
      assessmentId: 'assessment-1',
      versionId: 'version-1',
      versionNumber: 1,
      publishedByPrincipalId: 'creator-1',
      publishedAt: '2026-05-17T00:00:00.000Z',
      createdAt: '2026-05-17T00:00:00.000Z',
      sections: [
        {
          id: 'section-1',
          title: 'Section 1',
          position: 0,
          questions: [questions[0]!],
        },
      ],
      looseQuestions: [questions[1]!],
    };

    expect(flattenSnapshotQuestions(snapshot).map((question) => question.id)).toEqual(['q1', 'q2']);
  });

  it('finds and upserts answers', () => {
    const answer: AssessmentAttemptAnswerContract = {
      id: 'a1',
      questionId: 'q1',
      questionKind: 'MCQ',
      answer: { selectedOptionId: 'option-1' },
      status: 'DRAFT',
      savedAt: '2026-05-17T00:00:00.000Z',
      metadata: {},
    };

    const updatedAnswers = upsertLocalDraftAnswer({ answers: [], answer });
    expect(
      findAnswerForQuestion({ attempt: { ...attempt, answers: updatedAnswers }, questionId: 'q1' }),
    ).toEqual(answer);
  });

  it('evaluates attempt status helpers', () => {
    expect(isAttemptEditable(attempt)).toBe(true);
    expect(isAttemptSubmitted({ ...attempt, status: 'SUBMITTED' })).toBe(true);
    expect(
      isAttemptExpired(
        {
          ...attempt,
          expiresAt: '2026-05-16T00:00:00.000Z',
        },
        new Date('2026-05-17T00:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('counts answered questions', () => {
    expect(
      countAnsweredQuestions({
        questions,
        answers: [
          {
            id: 'a1',
            questionId: 'q1',
            questionKind: 'MCQ',
            answer: { selectedOptionId: 'option-1' },
            status: 'DRAFT',
            savedAt: '2026-05-17T00:00:00.000Z',
            metadata: {},
          },
        ],
      }),
    ).toBe(1);
    expect(countAnswerableQuestions(questions)).toBe(2);
    expect(isQuestionAnswerable('READING_PASSAGE')).toBe(false);
  });

  it('builds answer payloads for supported runtime types', () => {
    expect(toAnswerPayload({ questionKind: 'MCQ', value: 'option-1' })).toEqual({
      selectedOptionId: 'option-1',
    });
    expect(
      toAnswerPayload({
        questionKind: 'MULTI_SELECT',
        value: ['option-1', 'option-2'],
      }),
    ).toEqual({
      selectedOptionIds: ['option-1', 'option-2'],
    });
    expect(toAnswerPayload({ questionKind: 'TRUE_FALSE', value: true })).toEqual({
      value: true,
    });
    expect(toAnswerPayload({ questionKind: 'SHORT_ANSWER', value: 'short' })).toEqual({
      text: 'short',
    });
    expect(toAnswerPayload({ questionKind: 'LONG_ANSWER', value: 'long' })).toEqual({
      text: 'long',
    });
    expect(
      toAnswerPayload({
        questionKind: 'CODE',
        value: { sourceCode: 'const x = 1;', language: 'ts' },
      }),
    ).toEqual({
      sourceCode: 'const x = 1;',
      language: 'ts',
    });
    expect(toAnswerPayload({ questionKind: 'FILE_UPLOAD', value: ['file-1'] })).toEqual({
      mediaAssetIds: ['file-1'],
    });
    expect(toAnswerPayload({ questionKind: 'READING_PASSAGE', value: null })).toEqual({});
  });

  it('computes timer warning and urgent severities', () => {
    expect(
      getTimerSeverity(
        {
          ...attempt,
          expiresAt: '2026-05-17T00:04:00.000Z',
        },
        new Date('2026-05-17T00:00:00.000Z'),
      ),
    ).toBe('warning');
    expect(
      getTimerSeverity(
        {
          ...attempt,
          expiresAt: '2026-05-17T00:00:30.000Z',
        },
        new Date('2026-05-17T00:00:00.000Z'),
      ),
    ).toBe('urgent');
    expect(
      getTimerSeverity(
        {
          ...attempt,
          expiresAt: '2026-05-16T23:59:30.000Z',
        },
        new Date('2026-05-17T00:00:00.000Z'),
      ),
    ).toBe('expired');
  });
});
