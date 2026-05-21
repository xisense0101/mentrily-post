import { describe, expect, it } from 'vitest';
import { calculateScorePercent, canShowLearnerResult, formatScore, getResultStatusLabel, isResultReleased } from '../state';

describe('assessment result state', () => {
  it('detects released status', () => {
    expect(isResultReleased({ gradingStatus: 'RELEASED', releasedAt: '2026-01-01', answers: [] } as never)).toBe(true);
  });
  it('formats score', () => {
    expect(formatScore({ score: 7, maxScore: 10 })).toBe('7 / 10');
  });
  it('calculates percent', () => {
    expect(calculateScorePercent({ score: 3, maxScore: 4 })).toBe(75);
  });
  it('guards learner visibility', () => {
    expect(canShowLearnerResult({ gradingStatus: 'RELEASED', releasedAt: '2026-01-01' })).toBe(true);
    expect(canShowLearnerResult({ gradingStatus: 'GRADED', releasedAt: undefined })).toBe(false);
  });
  it('returns labels', () => {
    expect(getResultStatusLabel({ gradingStatus: 'PENDING_MANUAL_REVIEW', releasedAt: undefined })).toBe('Pending manual review');
  });
});
