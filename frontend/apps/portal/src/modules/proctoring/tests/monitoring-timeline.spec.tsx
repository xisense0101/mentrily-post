import { describe, expect, it } from 'vitest';
import { render } from '@/testing';
import { screen } from '@testing-library/react';
import { MonitoringTimeline } from '../components/monitoring-timeline';
import type {
  ProctoringAttemptMonitoringTimelineContract,
  ProctoringIncidentContract,
} from '@mentrily/domain-contracts';

const baseTimeline: ProctoringAttemptMonitoringTimelineContract = {
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
};

describe('MonitoringTimeline', () => {
  it('renders safe monitoring events without raw private fields', async () => {
    await render(<MonitoringTimeline timeline={baseTimeline} />);
    expect(screen.getByText('Assessment window lost focus')).toBeTruthy();
    expect(screen.queryByText(/clipboard/i)).toBeNull();
  });

  it('renders empty state when no events', async () => {
    await render(<MonitoringTimeline timeline={{ ...baseTimeline, events: [] }} />);
    expect(screen.getByTestId('monitoring-timeline-empty')).toBeTruthy();
  });

  it('does not render incident badge when no incidentsByEventId provided', async () => {
    await render(<MonitoringTimeline timeline={baseTimeline} />);
    expect(screen.queryByTestId(/incident-badge/)).toBeNull();
  });

  it('renders incident badge when incidentsByEventId contains linked incident', async () => {
    const incident: ProctoringIncidentContract = {
      id: 'inc-1',
      sessionId: 'session-1',
      attemptId: 'attempt-1',
      assessmentId: 'assessment-1',
      learnerPrincipalId: 'learner-1',
      incidentType: 'FOCUS_LOSS',
      severity: 'MEDIUM',
      status: 'OPEN',
      title: 'Focus loss incident',
      summary: 'Learner left window',
      firstEventAt: '2026-05-26T00:00:00.000Z',
      lastEventAt: '2026-05-26T00:00:00.000Z',
      eventCount: 1,
      createdAt: '2026-05-26T00:00:00.000Z',
      updatedAt: '2026-05-26T00:00:00.000Z',
    };

    const incidentsByEventId = new Map([['event-1', incident]]);

    await render(
      <MonitoringTimeline timeline={baseTimeline} incidentsByEventId={incidentsByEventId} />,
    );

    expect(screen.getByTestId('incident-badge-inc-1')).toBeTruthy();
    expect(screen.getByText(/MEDIUM incident/)).toBeTruthy();
  });

  it('incident badge links to incident detail page', async () => {
    const incident: ProctoringIncidentContract = {
      id: 'inc-2',
      sessionId: 'session-1',
      attemptId: 'attempt-1',
      assessmentId: 'assessment-1',
      learnerPrincipalId: 'learner-1',
      incidentType: 'FULLSCREEN_EXIT',
      severity: 'HIGH',
      status: 'OPEN',
      title: 'Fullscreen exit',
      summary: 'Exited fullscreen',
      firstEventAt: '2026-05-26T00:00:00.000Z',
      lastEventAt: '2026-05-26T00:00:00.000Z',
      eventCount: 1,
      createdAt: '2026-05-26T00:00:00.000Z',
      updatedAt: '2026-05-26T00:00:00.000Z',
    };

    const incidentsByEventId = new Map([['event-1', incident]]);

    await render(
      <MonitoringTimeline timeline={baseTimeline} incidentsByEventId={incidentsByEventId} />,
    );

    const badge = screen.getByTestId('incident-badge-inc-2');
    expect(badge.getAttribute('href')).toBe('/proctoring/incidents/inc-2');
  });

  it('does not show webcam/screen/audio controls', async () => {
    await render(<MonitoringTimeline timeline={baseTimeline} />);
    expect(screen.queryByText(/getUserMedia/i)).toBeNull();
    expect(screen.queryByText(/MediaRecorder/i)).toBeNull();
    expect(screen.queryByText(/getDisplayMedia/i)).toBeNull();
  });

  it('does not show raw keystroke data', async () => {
    await render(<MonitoringTimeline timeline={baseTimeline} />);
    expect(screen.queryByText(/event\.key/i)).toBeNull();
    expect(screen.queryByText(/KeyboardEvent/i)).toBeNull();
  });
});
