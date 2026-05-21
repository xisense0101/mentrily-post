import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreatorLearningPage } from '../routes';
import { getByText, queryByText, render } from '@/testing';

const mockUseCreatorLearningCourses = vi.fn();

vi.mock('../hooks', () => ({
  useCreatorLearningCourses: () => mockUseCreatorLearningCourses(),
}));

describe('CreatorLearningPage', () => {
  beforeEach(() => {
    mockUseCreatorLearningCourses.mockReset();
  });

  it('renders the loading state', async () => {
    mockUseCreatorLearningCourses.mockReturnValue({
      courses: [],
      createCourse: vi.fn(),
      error: null,
      loading: true,
      publishCourse: vi.fn(),
      refresh: vi.fn(),
    });

    const rendered = await render(<CreatorLearningPage />);

    expect(queryByText(rendered.container, 'No learning courses yet')).toBeNull();
    expect(rendered.container.textContent).toContain('Create a draft course');
  });

  it('renders the empty state', async () => {
    mockUseCreatorLearningCourses.mockReturnValue({
      courses: [],
      createCourse: vi.fn(),
      error: null,
      loading: false,
      publishCourse: vi.fn(),
      refresh: vi.fn(),
    });

    const rendered = await render(<CreatorLearningPage />);

    expect(getByText(rendered.container, 'No learning courses yet')).toBeTruthy();
  });

  it('renders the course list', async () => {
    mockUseCreatorLearningCourses.mockReturnValue({
      courses: [
        {
          id: 'course-1',
          title: 'Creator Course',
          slug: 'creator-course',
          status: 'DRAFT',
          visibility: 'WORKSPACE',
          sections: [],
        },
      ],
      createCourse: vi.fn(),
      error: null,
      loading: false,
      publishCourse: vi.fn(),
      refresh: vi.fn(),
    });

    const rendered = await render(<CreatorLearningPage />);

    expect(getByText(rendered.container, 'Creator Course')).toBeTruthy();
  });
});
