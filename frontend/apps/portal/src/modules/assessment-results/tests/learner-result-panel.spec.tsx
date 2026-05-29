import { describe, expect, it } from 'vitest';
import type { AssessmentLearnerResultContract } from '@/contracts/assessment-delivery';
import { render } from '@/testing';
import { LearnerResultPanel } from '../components/learner';

const result: AssessmentLearnerResultContract = {
  attemptId: 'attempt-1',
  assessmentId: 'assessment-1',
  snapshotId: 'snapshot-1',
  learnerPrincipalId: 'learner-1',
  status: 'SUBMITTED',
  gradingStatus: 'RELEASED',
  score: 3,
  maxScore: 4,
  submittedAt: '2026-01-01',
  releasedAt: '2026-01-02',
  answers: [
    {
      questionId: 'q-1',
      questionKind: 'LONG_ANSWER',
      score: 2,
      maxScore: 3,
      feedback: { note: 'Good' },
      answerStatus: 'SUBMITTED',
    },
  ],
};

describe('LearnerResultPanel', () => {
  it('renders score and feedback safely — no raw answer key fields exposed', async () => {
    const rendered = await render(<LearnerResultPanel result={result} />);
    expect(
      rendered.container.querySelector('[data-testid="learner-result-score-card"]'),
    ).toBeTruthy();
    // Feedback is present — shown as "Feedback available." for non-CODE, non-message feedback
    expect(rendered.container.textContent).toContain('Feedback available');
    // Raw JSON fields like correctOptionIds must never appear
    expect(rendered.container.textContent).not.toContain('correctOptionIds');
    // Raw JSON.stringify output must not appear
    expect(rendered.container.textContent).not.toContain('"note"');
    expect(rendered.container.textContent).not.toContain('{"note"');
  });
});
