import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentsPage } from '../routes';
import { getByText, render } from '@/testing';

const mockUseAssessments = vi.fn();

vi.mock('../hooks', () => ({
  useAssessments: () => mockUseAssessments(),
}));

vi.mock('../api', () => ({
  assessmentApiClient: {},
}));

describe('AssessmentsPage', () => {
  beforeEach(() => {
    mockUseAssessments.mockReset();
  });

  it('renders the empty state', async () => {
    mockUseAssessments.mockReturnValue({
      assessments: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      createAssessment: vi.fn(),
    });

    const rendered = await render(<AssessmentsPage />);
    expect(getByText(rendered.container, 'No assessments yet')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="assessments-page"]')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="assessment-empty-state"]')).toBeTruthy();
  });

  it('renders assessment cards', async () => {
    mockUseAssessments.mockReturnValue({
      assessments: [
        {
          id: 'assessment-1',
          title: 'Midterm Exam',
          purpose: 'EXAM',
          status: 'DRAFT',
          visibility: 'PRIVATE',
          ownerPrincipalId: 'principal-1',
          attemptPolicy: {},
          resultReleasePolicy: 'IMMEDIATE',
          metadata: {},
          gradingRubrics: [],
          gradingRules: [],
          createdAt: '2026-05-14T00:00:00.000Z',
          updatedAt: '2026-05-14T00:00:00.000Z',
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      createAssessment: vi.fn(),
    });

    const rendered = await render(<AssessmentsPage />);
    expect(getByText(rendered.container, 'Midterm Exam')).toBeTruthy();
  });

  it('renders loading skeleton', async () => {
    mockUseAssessments.mockReturnValue({
      assessments: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
      createAssessment: vi.fn(),
    });

    const rendered = await render(<AssessmentsPage />);
    expect(
      rendered.container.querySelector('[data-testid="assessment-list-skeleton"]'),
    ).toBeTruthy();
  });

  it('renders error state', async () => {
    mockUseAssessments.mockReturnValue({
      assessments: [],
      loading: false,
      error: 'Assessment loading failed.',
      refresh: vi.fn(),
      createAssessment: vi.fn(),
    });

    const rendered = await render(<AssessmentsPage />);
    expect(rendered.container.querySelector('[data-testid="assessment-error-state"]')).toBeTruthy();
  });
});
