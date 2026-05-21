import { describe, expect, it, vi } from 'vitest';
import { clickElement, render, waitFor } from '@/testing';
import { ReleaseResultButton } from '../components/instructor';

describe('ReleaseResultButton', () => {
  it('calls callback', async () => {
    const onRelease = vi.fn(async () => undefined);
    const rendered = await render(<ReleaseResultButton disabled={false} releasing={false} onRelease={onRelease} />);
    await clickElement(rendered.container.querySelector('button') as HTMLElement);
    await waitFor(() => expect(onRelease).toHaveBeenCalled());
  });

  it('disables when released path says so', async () => {
    const rendered = await render(<ReleaseResultButton disabled releasing={false} onRelease={() => undefined} />);
    expect((rendered.container.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
