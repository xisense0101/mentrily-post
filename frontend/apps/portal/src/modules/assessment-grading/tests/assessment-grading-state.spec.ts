import { describe, expect, it } from 'vitest';
import {
  calculateManualReviewProgress,
  formatLearnerAnswer,
  isGradingRunComplete,
  isGradingRunPartial,
  isManualReviewItemPending,
  toManualGradeRequest,
  validateManualGradeInput,
} from '../state';

const item = {
  answerGradeId: 'ag-1',
  gradingRunId: 'run-1',
  attemptId: 'attempt-1',
  answerId: 'answer-1',
  assessmentId: 'assessment-1',
  snapshotId: 'snapshot-1',
  questionId: 'q-1',
  questionKind: 'LONG_ANSWER',
  maxScore: 3,
  learnerAnswer: { text: 'essay' },
  learnerPrincipalId: 'learner-1',
  status: 'PENDING_MANUAL_REVIEW',
  method: 'MANUAL_REVIEW',
} as const;

describe('assessment-grading-state', () => {
  it('detects pending items', () => {
    expect(isManualReviewItemPending(item)).toBe(true);
  });

  it('detects complete and partial runs', () => {
    expect(isGradingRunComplete({ status: 'COMPLETED' } as never)).toBe(true);
    expect(isGradingRunPartial({ status: 'PARTIAL' } as never)).toBe(true);
  });

  it('calculates progress', () => {
    const progress = calculateManualReviewProgress({ items: [item, { ...item, answerGradeId: 'ag-2', status: 'MANUALLY_GRADED' }] });
    expect(progress).toEqual({ total: 2, pending: 1, completed: 1 });
  });

  it('validates score input', () => {
    expect(validateManualGradeInput({ score: 5, maxScore: 3 }).valid).toBe(false);
    expect(validateManualGradeInput({ score: -1, maxScore: 3 }).valid).toBe(false);
    expect(validateManualGradeInput({ score: 2, maxScore: 3 }).valid).toBe(true);
  });

  it('maps manual grade request', () => {
    expect(toManualGradeRequest({ score: 2, feedback: 'ok' })).toEqual({ score: 2, feedback: { note: 'ok' } });
  });

  it('formats learner answers', () => {
    expect(formatLearnerAnswer({ questionKind: 'LONG_ANSWER', answer: { text: 'long' } })).toContain('long');
    expect(formatLearnerAnswer({ questionKind: 'CODE', answer: { sourceCode: 'const x=1;' } })).toContain('const x=1;');
    expect(formatLearnerAnswer({ questionKind: 'SHORT_ANSWER', answer: { text: 'short' } })).toContain('short');
  });
});
