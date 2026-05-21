import { describe, expect, it } from 'vitest';
import WorkspaceLayout from '@/app/(workspace)/layout';
import { getByText, render } from '@/testing';

describe('WorkspaceLayout', () => {
  it('renders workspace navigation links', async () => {
    const rendered = await render(
      <WorkspaceLayout>
        <div>Child content</div>
      </WorkspaceLayout>,
    );

    expect(getByText(rendered.container, 'Dashboard')).toBeTruthy();
    expect(getByText(rendered.container, 'Learning')).toBeTruthy();
    expect(getByText(rendered.container, 'Content Studio')).toBeTruthy();

    const links = Array.from(rendered.container.querySelectorAll('a')).map((link) =>
      link.getAttribute('href'),
    );

    expect(links).toContain('/dashboard');
    expect(links).toContain('/learning');
    expect(links).toContain('/content');
  });
});
