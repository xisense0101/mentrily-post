import { describe, expect, it } from 'vitest';
import WorkspaceDashboardRoute from '@/app/(workspace)/dashboard/page';
import { getByText, render } from '@/testing';

describe('WorkspaceDashboardRoute', () => {
  it('renders Learning and Content cards', async () => {
    const rendered = await render(<WorkspaceDashboardRoute />);

    expect(getByText(rendered.container, 'Learning Delivery')).toBeTruthy();
    expect(getByText(rendered.container, 'Content Studio')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="learning-nav-card"]')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="content-nav-card"]')).toBeTruthy();
  });
});
