import { describe, expect, it } from 'vitest';
import { render } from '@/testing';
import { screen } from '@testing-library/react';
import { IncidentStatusBadge } from '../components/incident-status-badge';
import { IncidentSeverityBadge } from '../components/incident-severity-badge';

describe('IncidentStatusBadge', () => {
  it('renders OPEN status', async () => {
    await render(<IncidentStatusBadge status="OPEN" />);
    expect(screen.getByTestId('incident-status-badge')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();
  });

  it('renders IN_REVIEW status', async () => {
    await render(<IncidentStatusBadge status="IN_REVIEW" />);
    expect(screen.getByText('In Review')).toBeTruthy();
  });

  it('renders RESOLVED status', async () => {
    await render(<IncidentStatusBadge status="RESOLVED" />);
    expect(screen.getByText('Resolved')).toBeTruthy();
  });

  it('renders DISMISSED status', async () => {
    await render(<IncidentStatusBadge status="DISMISSED" />);
    expect(screen.getByText('Dismissed')).toBeTruthy();
  });

  it('renders ESCALATED status', async () => {
    await render(<IncidentStatusBadge status="ESCALATED" />);
    expect(screen.getByText('Escalated')).toBeTruthy();
  });
});

describe('IncidentSeverityBadge', () => {
  it('renders LOW severity', async () => {
    await render(<IncidentSeverityBadge severity="LOW" />);
    expect(screen.getByTestId('incident-severity-badge')).toBeTruthy();
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('renders MEDIUM severity', async () => {
    await render(<IncidentSeverityBadge severity="MEDIUM" />);
    expect(screen.getByText('Medium')).toBeTruthy();
  });

  it('renders HIGH severity', async () => {
    await render(<IncidentSeverityBadge severity="HIGH" />);
    expect(screen.getByText('High')).toBeTruthy();
  });

  it('renders CRITICAL severity', async () => {
    await render(<IncidentSeverityBadge severity="CRITICAL" />);
    expect(screen.getByText('Critical')).toBeTruthy();
  });
});
