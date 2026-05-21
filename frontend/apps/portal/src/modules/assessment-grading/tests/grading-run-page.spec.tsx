import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@/testing';
import { GradingRunPage } from '../routes';

const mockUseGradingRun = vi.fn();
const mockUseManualReviewQueue = vi.fn();

vi.mock('../hooks', () => ({
  useGradingRun: () => mockUseGradingRun(),
  useManualReviewQueue: () => mockUseManualReviewQueue(),
}));

describe('GradingRunPage', () => {
  beforeEach(() => {
    mockUseGradingRun.mockReset();
    mockUseManualReviewQueue.mockReset();
  });

  it('renders summary and manual grade form', async () => {
    mockUseGradingRun.mockReturnValue({
      gradingRun: { id: 'run-1', status: 'PARTIAL', totalScore: 1, maxScore: 5, answerGrades: [] },
      loading: false,
      submitting: false,
      error: null,
      refresh: vi.fn(),
      manualGradeAnswer: vi.fn(async () => undefined),
    });
    mockUseManualReviewQueue.mockReturnValue({
      items: [{
        gradingRunId: 'run-1',
        answerGradeId: 'grade-1',
        attemptId: 'attempt-1',
        answerId: 'answer-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        questionId: 'q-1',
        questionKind: 'LONG_ANSWER',
        questionTitle: 'Explain',
        questionPrompt: { text: 'Explain reasoning' },
        maxScore: 5,
        learnerAnswer: { text: 'essay' },
        learnerPrincipalId: 'learner-1',
        status: 'PENDING_MANUAL_REVIEW',
        method: 'MANUAL_REVIEW',
      }],
      loading: false,
      error: null,
      refresh: vi.fn(async () => undefined),
    });

    const rendered = await render(<GradingRunPage gradingRunId="run-1" />);
    expect(rendered.container.querySelector('[data-testid="grading-run-summary"]')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="manual-grade-form"]')).toBeTruthy();
  });

  it('renders loading and error states and tolerates empty queue data', async () => {
    mockUseGradingRun.mockReturnValueOnce({
      gradingRun: null,
      loading: true,
      submitting: false,
      error: null,
      refresh: vi.fn(),
      manualGradeAnswer: vi.fn(async () => undefined),
    });
    mockUseManualReviewQueue.mockReturnValueOnce({
      items: [],
      loading: true,
      error: null,
      refresh: vi.fn(async () => undefined),
    });
    const loadingRendered = await render(<GradingRunPage gradingRunId="run-1" />);
    expect(loadingRendered.container.textContent).toContain('Loading grading run...');

    mockUseGradingRun.mockReturnValueOnce({
      gradingRun: null,
      loading: false,
      submitting: false,
      error: 'Grading run failed to load.',
      refresh: vi.fn(),
      manualGradeAnswer: vi.fn(async () => undefined),
    });
    mockUseManualReviewQueue.mockReturnValueOnce({
      items: [],
      loading: false,
      error: null,
      refresh: vi.fn(async () => undefined),
    });
    const errorRendered = await render(<GradingRunPage gradingRunId="run-1" />);
    expect(errorRendered.container.textContent).toContain('Grading run failed to load.');
  });
});
