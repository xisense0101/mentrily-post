import { describe, expect, it } from 'vitest';
import WorkspaceDashboardRoute from '@/app/(workspace)/dashboard/page';
import { getByText, render } from '@/testing';

describe('WorkspaceDashboardRoute', () => {
  it('renders the dashboard foundation', async () => {
    const rendered = await render(<WorkspaceDashboardRoute />);

    expect(getByText(rendered.container, 'Dashboard')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="dashboard-page"]')).toBeTruthy();
  });
});
