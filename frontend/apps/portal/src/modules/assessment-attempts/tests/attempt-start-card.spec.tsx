import { describe, expect, it, vi } from 'vitest';
import { AttemptStartCard } from '../components/start';
import { clickElement, render, waitFor } from '@/testing';

describe('AttemptStartCard', () => {
  it('calls onStart when clicked', async () => {
    const onStart = vi.fn(async () => undefined);
    const rendered = await render(
      <AttemptStartCard assessmentId="assessment-1" isStarting={false} onStart={onStart} />,
    );

    const button = rendered.container.querySelector(
      '[data-testid="attempt-start-button"]',
    ) as HTMLButtonElement | null;
    expect(button).toBeTruthy();

    await clickElement(button!);
    await waitFor(() => {
      expect(onStart).toHaveBeenCalledTimes(1);
    });
  });
});
