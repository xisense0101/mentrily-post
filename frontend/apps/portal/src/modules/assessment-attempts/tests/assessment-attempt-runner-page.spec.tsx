import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentAttemptRunnerPage } from '../routes';
import { render } from '@/testing';

const mockUseAssessmentAttempt = vi.fn();

vi.mock('../hooks', () => ({
  useAssessmentAttempt: () => mockUseAssessmentAttempt(),
}));

describe('AssessmentAttemptRunnerPage', () => {
  beforeEach(() => {
    mockUseAssessmentAttempt.mockReset();
  });

  it('renders the runner shell and result placeholder for submitted attempts', async () => {
    mockUseAssessmentAttempt.mockReturnValue({
      attempt: {
        id: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        snapshotVersionNumber: 1,
        learnerPrincipalId: 'learner-1',
        status: 'SUBMITTED',
        serverNow: '2026-05-17T00:00:00.000Z',
        canEdit: false,
        canSubmit: false,
        session: {
          id: 'session-1',
          startedAt: '2026-05-17T00:00:00.000Z',
          lastSeenAt: '2026-05-17T00:00:00.000Z',
        },
        answers: [],
        result: {
          id: 'result-1',
          gradingStatus: 'NOT_GRADED',
          createdAt: '2026-05-17T00:00:00.000Z',
          updatedAt: '2026-05-17T00:00:00.000Z',
        },
        metadata: {},
        startedAt: '2026-05-17T00:00:00.000Z',
        createdAt: '2026-05-17T00:00:00.000Z',
        updatedAt: '2026-05-17T00:00:00.000Z',
      },
      snapshot: {
        id: 'snapshot-1',
        assessmentId: 'assessment-1',
        versionId: 'version-1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [
          {
            id: 'question-1',
            kind: 'SHORT_ANSWER',
            title: 'Question 1',
            prompt: { text: 'Prompt' },
            options: [],
            points: 1,
            gradingMode: 'MANUAL',
            position: 0,
          },
        ],
        publishedByPrincipalId: 'creator-1',
        publishedAt: '2026-05-17T00:00:00.000Z',
        createdAt: '2026-05-17T00:00:00.000Z',
      },
      loading: false,
      savingQuestionId: null,
      saveSuccessQuestionId: null,
      saveErrorQuestionId: null,
      saveConflictQuestionId: null,
      saveErrorMessage: null,
      submitting: false,
      submitErrorMessage: null,
      cancelling: false,
      error: null,
      isOffline: false,
      wasOffline: false,
      timerSeverity: null,
      refresh: vi.fn(),
      saveAnswer: vi.fn(),
      submitAttempt: vi.fn(),
      cancelAttempt: vi.fn(),
    });

    const rendered = await render(<AssessmentAttemptRunnerPage attemptId="attempt-1" />);
    expect(rendered.container.querySelector('[data-testid="attempt-runner-shell"]')).toBeTruthy();
    expect(
      rendered.container.querySelector('[data-testid="attempt-result-placeholder"]'),
    ).toBeTruthy();
    expect(
      (rendered.container.querySelector('input[type="text"]') as HTMLInputElement).disabled,
    ).toBe(true);
  });

  it('renders the error state when loading fails', async () => {
    mockUseAssessmentAttempt.mockReturnValue({
      attempt: null,
      snapshot: null,
      loading: false,
      savingQuestionId: null,
      saveSuccessQuestionId: null,
      saveErrorQuestionId: null,
      saveConflictQuestionId: null,
      saveErrorMessage: null,
      submitting: false,
      submitErrorMessage: null,
      cancelling: false,
      error: 'Failed to load attempt.',
      isOffline: false,
      wasOffline: false,
      timerSeverity: null,
      refresh: vi.fn(),
      saveAnswer: vi.fn(),
      submitAttempt: vi.fn(),
      cancelAttempt: vi.fn(),
    });

    const rendered = await render(<AssessmentAttemptRunnerPage attemptId="attempt-1" />);
    expect(rendered.container.querySelector('[data-testid="attempt-error-state"]')).toBeTruthy();
  });

  it('renders the loading state and tolerates missing data without throwing', async () => {
    mockUseAssessmentAttempt.mockReturnValue({
      attempt: null,
      snapshot: null,
      loading: true,
      savingQuestionId: null,
      saveSuccessQuestionId: null,
      saveErrorQuestionId: null,
      saveConflictQuestionId: null,
      saveErrorMessage: null,
      submitting: false,
      submitErrorMessage: null,
      cancelling: false,
      error: null,
      isOffline: false,
      wasOffline: false,
      timerSeverity: null,
      refresh: vi.fn(),
      saveAnswer: vi.fn(),
      submitAttempt: vi.fn(),
      cancelAttempt: vi.fn(),
    });

    const rendered = await render(<AssessmentAttemptRunnerPage attemptId="attempt-1" />);
    expect(rendered.container.textContent).toContain(
      'Loading attempt workspace, published snapshot, and saved answers...',
    );
  });

  it('renders timer urgency and offline submit messaging', async () => {
    mockUseAssessmentAttempt.mockReturnValue({
      attempt: {
        id: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        snapshotVersionNumber: 1,
        learnerPrincipalId: 'learner-1',
        status: 'IN_PROGRESS',
        serverNow: '2026-05-17T00:00:30.000Z',
        canEdit: false,
        canSubmit: false,
        expiresAt: '2026-05-17T00:01:00.000Z',
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
      },
      snapshot: {
        id: 'snapshot-1',
        assessmentId: 'assessment-1',
        versionId: 'version-1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        publishedByPrincipalId: 'creator-1',
        publishedAt: '2026-05-17T00:00:00.000Z',
        createdAt: '2026-05-17T00:00:00.000Z',
      },
      loading: false,
      savingQuestionId: null,
      saveSuccessQuestionId: null,
      saveErrorQuestionId: null,
      saveConflictQuestionId: null,
      saveErrorMessage: null,
      submitting: true,
      submitErrorMessage: 'Retry submit',
      cancelling: false,
      error: null,
      isOffline: true,
      wasOffline: true,
      timerSeverity: 'urgent',
      refresh: vi.fn(),
      saveAnswer: vi.fn(),
      submitAttempt: vi.fn(),
      cancelAttempt: vi.fn(),
    });

    const rendered = await render(<AssessmentAttemptRunnerPage attemptId="attempt-1" />);
    expect(rendered.container.textContent).toContain('Less than one minute remaining');
    expect(rendered.container.textContent).toContain('Connection lost');
    expect(rendered.container.textContent).toContain('Retry submit');
    expect(
      (
        rendered.container.querySelector(
          '[data-testid="attempt-submit-button"]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
