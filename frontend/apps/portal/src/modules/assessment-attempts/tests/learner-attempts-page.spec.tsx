import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnerAttemptsPage } from '../routes';
import { render } from '@/testing';

const mockUseLearnerAssessmentAttempts = vi.fn();

vi.mock('../hooks', () => ({
  useLearnerAssessmentAttempts: () => mockUseLearnerAssessmentAttempts(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('LearnerAttemptsPage', () => {
  beforeEach(() => {
    mockUseLearnerAssessmentAttempts.mockReset();
  });

  it('renders the empty state', async () => {
    mockUseLearnerAssessmentAttempts.mockReturnValue({
      attempts: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    const rendered = await render(<LearnerAttemptsPage />);
    expect(rendered.container.querySelector('[data-testid="attempt-empty-state"]')).toBeTruthy();
  });

  it('renders attempt cards', async () => {
    mockUseLearnerAssessmentAttempts.mockReturnValue({
      attempts: [
        {
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
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    const rendered = await render(<LearnerAttemptsPage />);
    expect(rendered.container.querySelector('[data-testid="attempt-card"]')).toBeTruthy();
  });
});
