import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@/testing';
import { LearnerResultPage } from '../routes';

const mockUseLearnerAssessmentResult = vi.fn();

vi.mock('../hooks', () => ({
  useLearnerAssessmentResult: () => mockUseLearnerAssessmentResult(),
}));

describe('LearnerResultPage', () => {
  beforeEach(() => {
    mockUseLearnerAssessmentResult.mockReset();
  });

  it('renders learner result page', async () => {
    mockUseLearnerAssessmentResult.mockReturnValue({
      result: {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        learnerPrincipalId: 'learner-1',
        status: 'SUBMITTED',
        gradingStatus: 'RELEASED',
        releasedAt: '2026-01-01',
        submittedAt: '2026-01-01',
        score: 1,
        maxScore: 1,
        answers: [],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    const rendered = await render(<LearnerResultPage attemptId="attempt-1" />);
    expect(rendered.container.querySelector('[data-testid="learner-result-page"]')).toBeTruthy();
  });

  it('renders loading and error states and does not throw on empty data', async () => {
    mockUseLearnerAssessmentResult.mockReturnValueOnce({
      result: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    const loadingRendered = await render(<LearnerResultPage attemptId="attempt-1" />);
    expect(loadingRendered.container.textContent).toContain('Loading result...');

    mockUseLearnerAssessmentResult.mockReturnValueOnce({
      result: null,
      loading: false,
      error: 'Result failed to load.',
      refresh: vi.fn(),
    });
    const errorRendered = await render(<LearnerResultPage attemptId="attempt-1" />);
    expect(errorRendered.container.textContent).toContain('Result failed to load.');
  });
});
