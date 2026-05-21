import { describe, expect, it } from 'vitest';
import { EnrollmentCard } from '../components/learner';
import { getByText, render } from '@/testing';

describe('EnrollmentCard', () => {
  it('renders status and dates', async () => {
    const rendered = await render(
      <EnrollmentCard
        enrollment={{
          id: 'enrollment-1',
          courseId: 'course-1',
          learnerPrincipalId: 'learner-1',
          status: 'COMPLETED',
          enrolledAt: '2026-05-12T00:00:00.000Z',
          completedAt: '2026-05-13T00:00:00.000Z',
        }}
      />,
    );

    expect(getByText(rendered.container, 'COMPLETED')).toBeTruthy();
    expect(getByText(rendered.container, '2026-05-12T00:00:00.000Z')).toBeTruthy();
    expect(getByText(rendered.container, '2026-05-13T00:00:00.000Z')).toBeTruthy();
  });
});
