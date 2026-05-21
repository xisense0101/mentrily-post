import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnerLearningPage } from '../routes';
import { getByText, render } from '@/testing';

const mockUseLearnerEnrollments = vi.fn();

vi.mock('../hooks', () => ({
  useLearnerEnrollments: () => mockUseLearnerEnrollments(),
}));

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');

  return {
    ...actual,
    completeLearningEnrollment: vi.fn(),
    getLearningCourse: vi.fn(),
    markLearningProgress: vi.fn(),
  };
});

describe('LearnerLearningPage', () => {
  beforeEach(() => {
    mockUseLearnerEnrollments.mockReset();
  });

  it('renders the enrollment empty state', async () => {
    mockUseLearnerEnrollments.mockReturnValue({
      completeEnrollment: vi.fn(),
      enrollCourse: vi.fn(),
      enrollments: [],
      error: null,
      loading: false,
      refresh: vi.fn(),
    });

    const rendered = await render(<LearnerLearningPage />);

    expect(getByText(rendered.container, 'No enrollments yet')).toBeTruthy();
  });

  it('renders the enrollment list', async () => {
    mockUseLearnerEnrollments.mockReturnValue({
      completeEnrollment: vi.fn(),
      enrollCourse: vi.fn(),
      enrollments: [
        {
          id: 'enrollment-1',
          courseId: 'course-1',
          learnerPrincipalId: 'learner-1',
          status: 'ACTIVE',
          enrolledAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      error: null,
      loading: false,
      refresh: vi.fn(),
    });

    const rendered = await render(<LearnerLearningPage />);

    expect(getByText(rendered.container, 'Course course-1')).toBeTruthy();
    expect(getByText(rendered.container, 'ACTIVE')).toBeTruthy();
  });
});
