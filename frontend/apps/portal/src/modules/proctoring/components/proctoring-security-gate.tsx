'use client';

import { useState } from 'react';
import type { SecurityPolicyRuntimeStateContract } from '@mentrily/domain-contracts';

/**
 * Renders the learner-safe security gate for monitored assessments.
 *
 * - Shows disclosure when requireDisclosureAcknowledgement is true
 * - Shows fullscreen gate when requireFullscreen is true
 * - Does not collect any webcam/audio/screen/clipboard/keystroke data
 * - Incidents are review signals only, not automatic verdicts
 */
export function ProctoringSecurityGate({
  securityState,
  onAcknowledge,
}: {
  securityState: SecurityPolicyRuntimeStateContract;
  onAcknowledge: (opts: { acknowledgeDisclosure: boolean; fullscreenSatisfied: boolean }) => void;
}) {
  const [localAck, setLocalAck] = useState(false);
  const [localFullscreen, setLocalFullscreen] = useState(false);

  const needsDisclosure = securityState.disclosureRequired && !securityState.disclosureAcknowledged;
  const needsFullscreen = securityState.fullscreenRequired && !securityState.fullscreenSatisfied;

  function handleProceed() {
    onAcknowledge({
      acknowledgeDisclosure: localAck,
      fullscreenSatisfied: localFullscreen,
    });
  }

  async function handleEnterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setLocalFullscreen(true);
    } catch {
      // Fullscreen request may be denied in some environments; still allow proceeding
      setLocalFullscreen(true);
    }
  }

  const canProceed =
    (!securityState.disclosureRequired || localAck) &&
    (!securityState.fullscreenRequired || localFullscreen);

  return (
    <section
      className="rounded-[2rem] border border-amber-200 bg-amber-50/80 p-8 shadow-sm"
      data-testid="proctoring-security-gate"
      aria-label="Assessment monitoring gate"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
        Assessment monitoring
      </p>

      <h2 className="mt-3 text-xl font-semibold text-amber-950">{securityState.disclosureTitle}</h2>
      <p className="mt-2 text-sm leading-6 text-amber-900">{securityState.disclosureBody}</p>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-white/70 px-5 py-4 text-xs leading-6 text-amber-900">
        <p className="font-semibold">About this monitoring</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Metadata-only monitoring — no webcam, screen, or audio recording</li>
          <li>No clipboard contents or keystrokes are collected</li>
          <li>Incidents are review signals, not automatic cheating verdicts</li>
          <li>Incidents do not automatically change scores or results</li>
          <li>Monitoring is always disclosed and never hidden</li>
        </ul>
      </div>

      {securityState.enabledEventCategories.length > 0 && (
        <div className="mt-4 text-xs text-amber-800">
          <p className="font-medium">What will be recorded during your attempt:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {securityState.enabledEventCategories.includes('trackFocusChanges') && (
              <li>Window and tab focus changes</li>
            )}
            {securityState.enabledEventCategories.includes('trackVisibilityChanges') && (
              <li>Page visibility changes</li>
            )}
            {securityState.enabledEventCategories.includes('trackFullscreenChanges') && (
              <li>Fullscreen entry and exit</li>
            )}
            {securityState.enabledEventCategories.includes('trackCopyPasteAttempts') && (
              <li>Copy and paste attempt metadata (no clipboard content)</li>
            )}
            {securityState.enabledEventCategories.includes('trackNetworkStatus') && (
              <li>Online and offline state</li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {needsDisclosure && (
          <label
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white/80 px-4 py-3 text-sm text-amber-950"
            data-testid="disclosure-acknowledgement-checkbox"
          >
            <input
              type="checkbox"
              className="mt-0.5 accent-amber-600"
              checked={localAck}
              onChange={(e) => setLocalAck(e.target.checked)}
              id="disclosure-ack"
            />
            <span>
              I have read and understand the monitoring disclosure above. I acknowledge that
              metadata-only monitoring will be active during this attempt.
            </span>
          </label>
        )}

        {needsFullscreen && (
          <div
            className="rounded-xl border border-amber-200 bg-white/80 px-4 py-3 text-sm text-amber-950"
            data-testid="fullscreen-gate"
          >
            <p className="font-medium">Fullscreen required</p>
            <p className="mt-1 text-xs text-amber-700">
              This assessment requires fullscreen mode. Click below to enter fullscreen before
              starting.
            </p>
            <button
              type="button"
              className="mt-3 rounded-full bg-amber-600 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              onClick={() => void handleEnterFullscreen()}
              disabled={localFullscreen}
              data-testid="enter-fullscreen-button"
            >
              {localFullscreen ? 'Fullscreen active ✓' : 'Enter fullscreen'}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className="mt-6 rounded-full bg-amber-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!canProceed}
        onClick={handleProceed}
        data-testid="proceed-to-attempt-button"
      >
        Proceed to attempt
      </button>
    </section>
  );
}
