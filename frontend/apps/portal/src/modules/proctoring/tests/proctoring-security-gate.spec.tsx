/**
 * Portal tests for proctoring security gate component (014I).
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProctoringSecurityGate } from '../components/proctoring-security-gate';
import type { SecurityPolicyRuntimeStateContract } from '@mentrily/domain-contracts';

function makeSecurityState(
  overrides: Partial<SecurityPolicyRuntimeStateContract> = {},
): SecurityPolicyRuntimeStateContract {
  return {
    proctoringMode: 'BASIC_EVENT_MONITORING',
    disclosureRequired: true,
    disclosureAcknowledged: false,
    fullscreenRequired: false,
    fullscreenSatisfied: false,
    canStartAttempt: true,
    canStartMonitoring: false,
    blockedReasons: ['DISCLOSURE_ACKNOWLEDGEMENT_REQUIRED'],
    enabledEventCategories: ['heartbeat', 'trackFocusChanges'],
    disclosureTitle: 'Metadata-only monitoring disclosure',
    disclosureBody: 'This attempt uses metadata-only monitoring. No webcam or audio is recorded.',
    ...overrides,
  };
}

describe('ProctoringSecurityGate', () => {
  it('renders disclosure title and body', () => {
    render(
      <ProctoringSecurityGate
        securityState={makeSecurityState()}
        onAcknowledge={() => undefined}
      />,
    );
    expect(screen.getByText('Metadata-only monitoring disclosure')).toBeTruthy();
    expect(screen.getByText(/No webcam or audio is recorded/)).toBeTruthy();
  });

  it('renders metadata-only copy: no webcam/screen/audio/clipboard/keystroke', () => {
    render(
      <ProctoringSecurityGate
        securityState={makeSecurityState()}
        onAcknowledge={() => undefined}
      />,
    );
    expect(screen.getByText(/no webcam, screen, or audio recording/i)).toBeTruthy();
    expect(screen.getByText(/no clipboard contents or keystrokes are collected/i)).toBeTruthy();
    expect(
      screen.getByText(/incidents are review signals, not automatic cheating verdicts/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/incidents do not automatically change scores or results/i),
    ).toBeTruthy();
  });

  it('shows disclosure checkbox when disclosureRequired=true', () => {
    render(
      <ProctoringSecurityGate
        securityState={makeSecurityState({
          disclosureRequired: true,
          disclosureAcknowledged: false,
        })}
        onAcknowledge={() => undefined}
      />,
    );
    expect(screen.getByTestId('disclosure-acknowledgement-checkbox')).toBeTruthy();
  });

  it('does not show disclosure checkbox when disclosureRequired=false', () => {
    render(
      <ProctoringSecurityGate
        securityState={makeSecurityState({
          disclosureRequired: false,
          disclosureAcknowledged: false,
          blockedReasons: [],
          canStartMonitoring: true,
        })}
        onAcknowledge={() => undefined}
      />,
    );
    expect(screen.queryByTestId('disclosure-acknowledgement-checkbox')).toBeNull();
  });

  it('shows fullscreen gate when fullscreenRequired=true and not satisfied', () => {
    render(
      <ProctoringSecurityGate
        securityState={makeSecurityState({
          disclosureRequired: false,
          fullscreenRequired: true,
          fullscreenSatisfied: false,
          blockedReasons: ['FULLSCREEN_REQUIRED'],
        })}
        onAcknowledge={() => undefined}
      />,
    );
    expect(screen.getByTestId('fullscreen-gate')).toBeTruthy();
    expect(screen.getByTestId('enter-fullscreen-button')).toBeTruthy();
  });

  it('proceed button is disabled when disclosure not acknowledged', () => {
    render(
      <ProctoringSecurityGate
        securityState={makeSecurityState({
          disclosureRequired: true,
          disclosureAcknowledged: false,
        })}
        onAcknowledge={() => undefined}
      />,
    );
    const btn = screen.getByTestId('proceed-to-attempt-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('proceed button enabled after checking disclosure', () => {
    const onAcknowledge = vi.fn();
    render(
      <ProctoringSecurityGate
        securityState={makeSecurityState({
          disclosureRequired: true,
          disclosureAcknowledged: false,
          fullscreenRequired: false,
        })}
        onAcknowledge={onAcknowledge}
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    const btn = screen.getByTestId('proceed-to-attempt-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('clicking proceed calls onAcknowledge with correct flags', () => {
    const onAcknowledge = vi.fn();
    render(
      <ProctoringSecurityGate
        securityState={makeSecurityState({
          disclosureRequired: true,
          disclosureAcknowledged: false,
          fullscreenRequired: false,
        })}
        onAcknowledge={onAcknowledge}
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    const btn = screen.getByTestId('proceed-to-attempt-button');
    fireEvent.click(btn);
    expect(onAcknowledge).toHaveBeenCalledWith({
      acknowledgeDisclosure: true,
      fullscreenSatisfied: false,
    });
  });

  it('shows enabled event categories from policy', () => {
    render(
      <ProctoringSecurityGate
        securityState={makeSecurityState({
          enabledEventCategories: ['heartbeat', 'trackFocusChanges', 'trackNetworkStatus'],
        })}
        onAcknowledge={() => undefined}
      />,
    );
    expect(screen.getByText(/Window and tab focus changes/)).toBeTruthy();
    expect(screen.getByText(/Online and offline state/)).toBeTruthy();
  });

  it('does not show webcam/screen/audio controls', () => {
    render(
      <ProctoringSecurityGate
        securityState={makeSecurityState()}
        onAcknowledge={() => undefined}
      />,
    );
    // No webcam UI elements
    expect(screen.queryByRole('button', { name: /webcam/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /screen share/i })).toBeNull();
  });
});
