import { describe, expect, it, vi } from 'vitest';
import { render } from '@/testing';
import { ManualReviewPage } from '../routes';

vi.mock('../hooks', () => ({
  useManualReviewQueue: vi.fn(() => ({ items: [], loading: false, error: null, refresh: vi.fn() })),
}));

describe('ManualReviewPage', () => {
  it('renders empty state', async () => {
    const rendered = await render(<ManualReviewPage />);
    expect(rendered.container.querySelector('[data-testid="manual-review-empty-state"]')).toBeTruthy();
  });
});
