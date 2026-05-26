import { describe, expect, it } from 'vitest';
import { render } from '@/testing';
import { screen } from '@testing-library/react';
import { ProctoringDisclosureCard } from '../components/proctoring-disclosure-card';

describe('ProctoringDisclosureCard', () => {
  it('renders the visible disclosure and privacy limits', async () => {
    await render(
      <ProctoringDisclosureCard
        summary={{
          enabled: true,
          mode: 'BASIC_EVENT_MONITORING',
          required: true,
          disclosure: {
            mode: 'BASIC_EVENT_MONITORING',
            required: true,
            title: 'Monitoring disclosure',
            message: 'Metadata only',
            visible: true,
            captures: ['Window focus'],
            doesNotCapture: ['Clipboard contents', 'Raw keystrokes'],
          },
        }}
      />,
    );

    expect(screen.getAllByText('Monitoring disclosure')).toHaveLength(2);
    expect(screen.getByText('Window focus')).toBeTruthy();
    expect(screen.getByText('Clipboard contents')).toBeTruthy();
  });
});
