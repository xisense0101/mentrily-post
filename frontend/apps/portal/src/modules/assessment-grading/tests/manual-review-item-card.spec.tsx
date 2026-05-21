import { describe, expect, it } from 'vitest';
import { render } from '@/testing';
import { ManualReviewItemCard } from '../components/manual-review';

const item = {
  gradingRunId: 'run-1',
  answerGradeId: 'grade-1',
  attemptId: 'attempt-1',
  answerId: 'answer-1',
  assessmentId: 'assessment-1',
  snapshotId: 'snapshot-1',
  questionId: 'q-1',
  questionKind: 'LONG_ANSWER',
  questionTitle: 'Explain',
  maxScore: 5,
  learnerAnswer: { text: 'essay' },
  learnerPrincipalId: 'learner-1',
  assessmentTitle: 'Assessment A',
  status: 'PENDING_MANUAL_REVIEW',
  method: 'MANUAL_REVIEW',
} as const;

describe('ManualReviewItemCard', () => {
  it('renders manual review context', async () => {
    const rendered = await render(<ManualReviewItemCard item={item} />);
    expect(rendered.container.querySelector('[data-testid="manual-review-item-card"]')).toBeTruthy();
    expect(rendered.container.textContent).toContain('Assessment A');
    expect(rendered.container.textContent).toContain('learner-1');
    expect(rendered.container.textContent).toContain('Explain');
  });
});
