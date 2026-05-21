import { describe, expect, it } from 'vitest';
import { CourseListCard } from '../components/creator';
import { getByText, render } from '@/testing';

describe('CourseListCard', () => {
  it('renders title, status, and lesson count', async () => {
    const rendered = await render(
      <CourseListCard
        course={{
          id: 'course-1',
          title: 'Learning API',
          slug: 'learning-api',
          status: 'PUBLISHED',
          visibility: 'WORKSPACE',
          publishedAt: '2026-05-12T00:00:00.000Z',
          sections: [
            {
              id: 'section-1',
              title: 'Intro',
              position: 0,
              lessons: [
                {
                  id: 'lesson-1',
                  title: 'Welcome',
                  kind: 'TEXT',
                  position: 0,
                  isRequired: true,
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(getByText(rendered.container, 'Learning API')).toBeTruthy();
    expect(getByText(rendered.container, 'PUBLISHED')).toBeTruthy();
    expect(getByText(rendered.container, '1 lessons')).toBeTruthy();
  });
});
