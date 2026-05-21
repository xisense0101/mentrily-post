import { describe, expect, it, vi } from 'vitest';
import { clickElement, render, waitFor } from '@/testing';
import { InstructorResultPage } from '../routes';

const releaseResult = vi.fn(async () => undefined);
vi.mock('../hooks', () => ({
  useInstructorAssessmentResult: vi.fn(() => ({ result: { attemptId: 'attempt-1', assessmentId: 'assessment-1', snapshotId: 'snapshot-1', learnerPrincipalId: 'learner-1', status: 'SUBMITTED', gradingStatus: 'GRADED', score: 3, maxScore: 4, answers: [{ answerId: 'answer-1', learnerAnswer: { text: 'essay' }, questionId: 'q-1', questionKind: 'LONG_ANSWER', answerStatus: 'SUBMITTED' }] }, loading: false, releasing: false, error: null, refresh: vi.fn(), releaseResult })),
}));

describe('InstructorResultPage', () => {
  it('renders and triggers release', async () => {
    const rendered = await render(<InstructorResultPage attemptId="attempt-1" />);
    const button = rendered.container.querySelector('[data-testid="release-result-button"]');
    expect(button).toBeTruthy();
    await clickElement(button as HTMLElement);
    await waitFor(() => expect(releaseResult).toHaveBeenCalled());
  });
});
