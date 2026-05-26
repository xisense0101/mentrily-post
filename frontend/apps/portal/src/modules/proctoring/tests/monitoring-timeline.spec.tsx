import { describe, expect, it } from 'vitest';
import { render } from '@/testing';
import { screen } from '@testing-library/react';
import { MonitoringTimeline } from '../components/monitoring-timeline';

describe('MonitoringTimeline', () => {
  it('renders safe monitoring events without raw private fields', async () => {
    await render(
      <MonitoringTimeline
        timeline={{
          attemptId: 'attempt-1',
          assessmentId: 'assessment-1',
          disclosure: {
            mode: 'BASIC_EVENT_MONITORING',
            required: true,
            title: 'Disclosure',
            message: 'Visible',
            visible: true,
            captures: [],
            doesNotCapture: [],
          },
          events: [
            {
              id: 'event-1',
              sessionId: 'session-1',
              attemptId: 'attempt-1',
              assessmentId: 'assessment-1',
              eventType: 'WINDOW_BLUR',
              severity: 'LOW',
              occurredAt: '2026-05-26T00:00:00.000Z',
              receivedAt: '2026-05-26T00:00:01.000Z',
              message: 'Assessment window lost focus',
              metadataSummary: { sequence: 1 },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Assessment window lost focus')).toBeTruthy();
    expect(screen.queryByText(/clipboard/i)).toBeNull();
  });
});
