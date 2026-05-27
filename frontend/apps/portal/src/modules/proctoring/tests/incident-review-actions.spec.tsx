import { describe, expect, it, vi } from 'vitest';
import { render } from '@/testing';
import { screen, fireEvent } from '@testing-library/react';
import { IncidentReviewActions } from '../components/incident-review-actions';
import { IncidentNoteForm } from '../components/incident-note-form';

const noop = () => undefined;

describe('IncidentReviewActions', () => {
  it('renders all action buttons', async () => {
    await render(
      <IncidentReviewActions
        actions={[]}
        currentStatus="OPEN"
        submitting={false}
        onMarkInReview={noop}
        onResolve={noop}
        onDismiss={noop}
        onEscalate={noop}
      />,
    );
    expect(screen.getByTestId('btn-mark-in-review')).toBeTruthy();
    expect(screen.getByTestId('btn-resolve')).toBeTruthy();
    expect(screen.getByTestId('btn-dismiss')).toBeTruthy();
    expect(screen.getByTestId('btn-escalate')).toBeTruthy();
  });

  it('disables in-review button when status is already IN_REVIEW', async () => {
    await render(
      <IncidentReviewActions
        actions={[]}
        currentStatus="IN_REVIEW"
        submitting={false}
        onMarkInReview={noop}
        onResolve={noop}
        onDismiss={noop}
        onEscalate={noop}
      />,
    );
    const btn = screen.getByTestId('btn-mark-in-review');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('disables resolved button when status is already RESOLVED', async () => {
    await render(
      <IncidentReviewActions
        actions={[]}
        currentStatus="RESOLVED"
        submitting={false}
        onMarkInReview={noop}
        onResolve={noop}
        onDismiss={noop}
        onEscalate={noop}
      />,
    );
    expect(screen.getByTestId('btn-resolve').hasAttribute('disabled')).toBe(true);
  });

  it('disables all buttons while submitting', async () => {
    await render(
      <IncidentReviewActions
        actions={[]}
        currentStatus="OPEN"
        submitting={true}
        onMarkInReview={noop}
        onResolve={noop}
        onDismiss={noop}
        onEscalate={noop}
      />,
    );
    expect(screen.getByTestId('btn-mark-in-review').hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('btn-resolve').hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('btn-dismiss').hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('btn-escalate').hasAttribute('disabled')).toBe(true);
  });

  it('calls onMarkInReview when clicked', async () => {
    const handler = vi.fn();
    await render(
      <IncidentReviewActions
        actions={[]}
        currentStatus="OPEN"
        submitting={false}
        onMarkInReview={handler}
        onResolve={noop}
        onDismiss={noop}
        onEscalate={noop}
      />,
    );
    fireEvent.click(screen.getByTestId('btn-mark-in-review'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onResolve when clicked', async () => {
    const handler = vi.fn();
    await render(
      <IncidentReviewActions
        actions={[]}
        currentStatus="OPEN"
        submitting={false}
        onMarkInReview={noop}
        onResolve={handler}
        onDismiss={noop}
        onEscalate={noop}
      />,
    );
    fireEvent.click(screen.getByTestId('btn-resolve'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when clicked', async () => {
    const handler = vi.fn();
    await render(
      <IncidentReviewActions
        actions={[]}
        currentStatus="OPEN"
        submitting={false}
        onMarkInReview={noop}
        onResolve={noop}
        onDismiss={handler}
        onEscalate={noop}
      />,
    );
    fireEvent.click(screen.getByTestId('btn-dismiss'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onEscalate when clicked', async () => {
    const handler = vi.fn();
    await render(
      <IncidentReviewActions
        actions={[]}
        currentStatus="OPEN"
        submitting={false}
        onMarkInReview={noop}
        onResolve={noop}
        onDismiss={noop}
        onEscalate={handler}
      />,
    );
    fireEvent.click(screen.getByTestId('btn-escalate'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('shows review action history', async () => {
    await render(
      <IncidentReviewActions
        actions={[
          {
            id: 'action-1',
            incidentId: 'inc-1',
            actionType: 'NOTE_ADDED',
            actorPrincipalId: 'actor-1',
            actorDisplayName: 'Teacher A',
            note: 'Reviewed the incident carefully.',
            createdAt: '2026-05-27T11:00:00.000Z',
          },
        ]}
        currentStatus="IN_REVIEW"
        submitting={false}
        onMarkInReview={noop}
        onResolve={noop}
        onDismiss={noop}
        onEscalate={noop}
      />,
    );
    expect(screen.getByTestId('incident-review-action-history')).toBeTruthy();
    expect(screen.getByText('Note added')).toBeTruthy();
    expect(screen.getByText(/Teacher A/)).toBeTruthy();
    expect(screen.getByText('Reviewed the incident carefully.')).toBeTruthy();
  });
});

describe('IncidentNoteForm', () => {
  it('renders note input and submit button', async () => {
    await render(<IncidentNoteForm submitting={false} onSubmit={noop} />);
    expect(screen.getByTestId('incident-note-input')).toBeTruthy();
    expect(screen.getByTestId('btn-add-note')).toBeTruthy();
  });

  it('submit button is disabled when note is empty', async () => {
    await render(<IncidentNoteForm submitting={false} onSubmit={noop} />);
    expect(screen.getByTestId('btn-add-note').hasAttribute('disabled')).toBe(true);
  });

  it('shows error when submitting empty note', async () => {
    await render(<IncidentNoteForm submitting={false} onSubmit={noop} />);
    // Directly submit the form without typing
    const form = screen.getByTestId('incident-note-form');
    fireEvent.submit(form);
    expect(screen.getByTestId('incident-note-error')).toBeTruthy();
    expect(screen.getByText('Note cannot be empty.')).toBeTruthy();
  });

  it('shows error when note exceeds 2000 characters', async () => {
    const onSubmit = vi.fn();
    await render(<IncidentNoteForm submitting={false} onSubmit={onSubmit} />);
    const input = screen.getByTestId('incident-note-input');
    fireEvent.change(input, { target: { value: 'a'.repeat(2001) } });
    const form = screen.getByTestId('incident-note-form');
    fireEvent.submit(form);
    expect(screen.getByTestId('incident-note-error')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with note text when valid', async () => {
    const onSubmit = vi.fn();
    await render(<IncidentNoteForm submitting={false} onSubmit={onSubmit} />);
    const input = screen.getByTestId('incident-note-input');
    fireEvent.change(input, { target: { value: 'Valid review note' } });
    const form = screen.getByTestId('incident-note-form');
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledWith('Valid review note');
  });

  it('disables input and button while submitting', async () => {
    await render(<IncidentNoteForm submitting={true} onSubmit={noop} />);
    expect(screen.getByTestId('incident-note-input').hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('btn-add-note').hasAttribute('disabled')).toBe(true);
  });

  it('shows submitting label while in-flight', async () => {
    await render(<IncidentNoteForm submitting={true} onSubmit={noop} />);
    expect(screen.getByText('Adding note…')).toBeTruthy();
  });

  it('shows character count', async () => {
    await render(<IncidentNoteForm submitting={false} onSubmit={noop} />);
    expect(screen.getByTestId('incident-note-char-count')).toBeTruthy();
    expect(screen.getByText('2000 characters remaining')).toBeTruthy();
  });
});
