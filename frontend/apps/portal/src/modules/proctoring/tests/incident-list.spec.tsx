import { describe, expect, it } from 'vitest';
import { render } from '@/testing';
import { screen } from '@testing-library/react';
import { IncidentList } from '../components/incident-list';
import type { ProctoringIncidentContract } from '@mentrily/domain-contracts';

const baseIncident: ProctoringIncidentContract = {
  id: 'inc-1',
  sessionId: 'sess-1',
  attemptId: 'att-1',
  assessmentId: 'assess-1',
  learnerPrincipalId: 'learner-1',
  learnerDisplayName: 'Test Learner',
  incidentType: 'FOCUS_LOSS',
  severity: 'MEDIUM',
  status: 'OPEN',
  title: 'Focus lost during assessment',
  summary: 'Learner switched away from the assessment window',
  firstEventAt: '2026-05-27T10:00:00.000Z',
  lastEventAt: '2026-05-27T10:05:00.000Z',
  eventCount: 3,
  createdAt: '2026-05-27T10:00:00.000Z',
  updatedAt: '2026-05-27T10:05:00.000Z',
};

describe('IncidentList', () => {
  it('renders empty state when no incidents', async () => {
    await render(<IncidentList incidents={[]} />);
    expect(screen.getByTestId('incident-list-empty')).toBeTruthy();
  });

  it('renders incident table with safe fields', async () => {
    await render(<IncidentList incidents={[baseIncident]} />);
    expect(screen.getByTestId('incident-list')).toBeTruthy();
    expect(screen.getByText('Focus lost during assessment')).toBeTruthy();
    expect(screen.getByText('Test Learner')).toBeTruthy();
    expect(screen.getByText('FOCUS LOSS')).toBeTruthy();
  });

  it('does not show raw event payload', async () => {
    await render(<IncidentList incidents={[baseIncident]} />);
    expect(screen.queryByText(/rawPayload/i)).toBeNull();
    expect(screen.queryByText(/clipboardData/i)).toBeNull();
    expect(screen.queryByText(/storageKey/i)).toBeNull();
  });

  it('does not show unreleased score or private grading data', async () => {
    await render(<IncidentList incidents={[baseIncident]} />);
    expect(screen.queryByText(/unreleasedScore/i)).toBeNull();
    expect(screen.queryByText(/graderNotes/i)).toBeNull();
    expect(screen.queryByText(/riskScore/i)).toBeNull();
    expect(screen.queryByText(/cheatingScore/i)).toBeNull();
  });

  it('renders severity badge', async () => {
    await render(<IncidentList incidents={[baseIncident]} />);
    expect(screen.getByTestId('incident-severity-badge')).toBeTruthy();
    expect(screen.getByText('Medium')).toBeTruthy();
  });

  it('renders status badge', async () => {
    await render(<IncidentList incidents={[baseIncident]} />);
    expect(screen.getByTestId('incident-status-badge')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();
  });

  it('shows event count and timestamps', async () => {
    await render(<IncidentList incidents={[baseIncident]} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('links to incident detail page', async () => {
    await render(<IncidentList incidents={[baseIncident]} />);
    const link = screen.getByTestId('incident-link-inc-1');
    expect(link.getAttribute('href')).toBe('/proctoring/incidents/inc-1');
  });

  it('no webcam/screen/audio controls rendered', async () => {
    await render(<IncidentList incidents={[baseIncident]} />);
    expect(screen.queryByText(/webcam/i)).toBeNull();
    expect(screen.queryByText(/getUserMedia/i)).toBeNull();
    expect(screen.queryByText(/MediaRecorder/i)).toBeNull();
  });
});
