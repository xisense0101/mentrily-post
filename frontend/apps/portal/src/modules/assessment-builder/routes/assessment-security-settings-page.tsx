'use client';

import { useEffect, useState } from 'react';
import type {
  AssessmentSecurityPolicyContract,
  UpdateAssessmentSecurityPolicyRequestContract,
} from '@mentrily/domain-contracts';
import { proctoringApiClient } from '@/modules/proctoring/api/proctoring-api-client';

interface AssessmentSecuritySettingsPageProps {
  assessmentId: string;
}

const defaultPolicy: UpdateAssessmentSecurityPolicyRequestContract = {
  proctoringMode: 'OFF',
  requireDisclosureAcknowledgement: true,
  requireFullscreen: false,
  trackFocusChanges: true,
  trackVisibilityChanges: true,
  trackFullscreenChanges: true,
  trackCopyPasteAttempts: true,
  trackNetworkStatus: true,
  heartbeatIntervalSeconds: 30,
  incidentThresholdFocusLossCount: 3,
  incidentThresholdFocusLossWindowSeconds: 600,
  incidentThresholdVisibilityHiddenCount: 3,
  incidentThresholdVisibilityHiddenWindowSeconds: 600,
  incidentThresholdNetworkOfflineCount: 3,
  incidentThresholdNetworkOfflineWindowSeconds: 600,
};

function toEditablePolicy(
  policy: AssessmentSecurityPolicyContract,
): UpdateAssessmentSecurityPolicyRequestContract {
  return {
    proctoringMode: policy.proctoringMode,
    requireDisclosureAcknowledgement: policy.requireDisclosureAcknowledgement,
    requireFullscreen: policy.requireFullscreen,
    trackFocusChanges: policy.trackFocusChanges,
    trackVisibilityChanges: policy.trackVisibilityChanges,
    trackFullscreenChanges: policy.trackFullscreenChanges,
    trackCopyPasteAttempts: policy.trackCopyPasteAttempts,
    trackNetworkStatus: policy.trackNetworkStatus,
    heartbeatIntervalSeconds: policy.heartbeatIntervalSeconds,
    incidentThresholdFocusLossCount: policy.incidentThresholdFocusLossCount,
    incidentThresholdFocusLossWindowSeconds: policy.incidentThresholdFocusLossWindowSeconds,
    incidentThresholdVisibilityHiddenCount: policy.incidentThresholdVisibilityHiddenCount,
    incidentThresholdVisibilityHiddenWindowSeconds:
      policy.incidentThresholdVisibilityHiddenWindowSeconds,
    incidentThresholdNetworkOfflineCount: policy.incidentThresholdNetworkOfflineCount,
    incidentThresholdNetworkOfflineWindowSeconds:
      policy.incidentThresholdNetworkOfflineWindowSeconds,
    disclosureTitle: policy.disclosureTitle,
    disclosureBody: policy.disclosureBody,
  };
}

export function AssessmentSecuritySettingsPage({
  assessmentId,
}: AssessmentSecuritySettingsPageProps) {
  const [policy, setPolicy] =
    useState<UpdateAssessmentSecurityPolicyRequestContract>(defaultPolicy);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void proctoringApiClient
      .getAssessmentSecurityPolicy(assessmentId)
      .then((response) => {
        if (!cancelled) {
          setPolicy(toEditablePolicy(response));
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Failed to load security policy.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  const monitored = policy.proctoringMode === 'BASIC_EVENT_MONITORING';

  async function save() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const saved = await proctoringApiClient.updateAssessmentSecurityPolicy(assessmentId, policy);
      setPolicy(toEditablePolicy(saved));
      setSuccessMessage('Security policy saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save security policy.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="assessment-security-settings-page">
      <section className="rounded-[2rem] border border-portal-border bg-white/90 p-8 shadow-portal-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">
              Assessment Security Policy
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-portal-text">Security settings</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-portal-text-muted">
              Metadata-only monitoring. No webcam, screen, or audio recording. No clipboard contents
              or keystrokes are collected. Incidents are review signals, not automatic cheating
              verdicts. Incidents do not automatically change scores or results.
            </p>
          </div>
          <a
            className="rounded-full border border-portal-border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
            href={`/assessments/${assessmentId}`}
          >
            Back to assessment
          </a>
        </div>
      </section>

      <section className="rounded-[2rem] border border-portal-border bg-white/90 p-8 shadow-portal-sm">
        {loading ? <p className="text-sm text-slate-500">Loading security policy...</p> : null}
        {!loading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900" htmlFor="proctoringMode">
                Proctoring mode
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                id="proctoringMode"
                onChange={(event) =>
                  setPolicy((current) => ({
                    ...current,
                    proctoringMode: event.target
                      .value as UpdateAssessmentSecurityPolicyRequestContract['proctoringMode'],
                  }))
                }
                value={policy.proctoringMode}
              >
                <option value="OFF">OFF</option>
                <option value="BASIC_EVENT_MONITORING">BASIC_EVENT_MONITORING</option>
                <option disabled value="RESERVED_LIVE_MONITORING">
                  RESERVED_LIVE_MONITORING
                </option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ToggleField
                checked={policy.requireDisclosureAcknowledgement}
                label="Require disclosure acknowledgement"
                onChange={(checked) =>
                  setPolicy((current) => ({
                    ...current,
                    requireDisclosureAcknowledgement: checked,
                  }))
                }
              />
              <ToggleField
                checked={policy.requireFullscreen}
                label="Require fullscreen"
                onChange={(checked) =>
                  setPolicy((current) => ({ ...current, requireFullscreen: checked }))
                }
              />
              <ToggleField
                checked={policy.trackFocusChanges}
                label="Track focus changes"
                onChange={(checked) =>
                  setPolicy((current) => ({ ...current, trackFocusChanges: checked }))
                }
              />
              <ToggleField
                checked={policy.trackVisibilityChanges}
                label="Track visibility changes"
                onChange={(checked) =>
                  setPolicy((current) => ({ ...current, trackVisibilityChanges: checked }))
                }
              />
              <ToggleField
                checked={policy.trackFullscreenChanges}
                label="Track fullscreen changes"
                onChange={(checked) =>
                  setPolicy((current) => ({ ...current, trackFullscreenChanges: checked }))
                }
              />
              <ToggleField
                checked={policy.trackCopyPasteAttempts}
                label="Track copy/paste attempts metadata only"
                onChange={(checked) =>
                  setPolicy((current) => ({ ...current, trackCopyPasteAttempts: checked }))
                }
              />
              <ToggleField
                checked={policy.trackNetworkStatus}
                label="Track network status"
                onChange={(checked) =>
                  setPolicy((current) => ({ ...current, trackNetworkStatus: checked }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Heartbeat interval seconds</span>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  min={15}
                  max={120}
                  onChange={(event) =>
                    setPolicy((current) => ({
                      ...current,
                      heartbeatIntervalSeconds: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={policy.heartbeatIntervalSeconds}
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Disclosure title</span>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  maxLength={120}
                  onChange={(event) =>
                    setPolicy((current) => ({
                      ...current,
                      disclosureTitle: event.target.value,
                    }))
                  }
                  value={policy.disclosureTitle ?? ''}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <NumericField
                label="Focus loss threshold count"
                value={policy.incidentThresholdFocusLossCount}
                onChange={(value) =>
                  setPolicy((current) => ({ ...current, incidentThresholdFocusLossCount: value }))
                }
              />
              <NumericField
                label="Focus loss window seconds"
                value={policy.incidentThresholdFocusLossWindowSeconds}
                onChange={(value) =>
                  setPolicy((current) => ({
                    ...current,
                    incidentThresholdFocusLossWindowSeconds: value,
                  }))
                }
              />
              <NumericField
                label="Visibility hidden threshold count"
                value={policy.incidentThresholdVisibilityHiddenCount}
                onChange={(value) =>
                  setPolicy((current) => ({
                    ...current,
                    incidentThresholdVisibilityHiddenCount: value,
                  }))
                }
              />
              <NumericField
                label="Visibility hidden window seconds"
                value={policy.incidentThresholdVisibilityHiddenWindowSeconds}
                onChange={(value) =>
                  setPolicy((current) => ({
                    ...current,
                    incidentThresholdVisibilityHiddenWindowSeconds: value,
                  }))
                }
              />
              <NumericField
                label="Network offline threshold count"
                value={policy.incidentThresholdNetworkOfflineCount}
                onChange={(value) =>
                  setPolicy((current) => ({
                    ...current,
                    incidentThresholdNetworkOfflineCount: value,
                  }))
                }
              />
              <NumericField
                label="Network offline window seconds"
                value={policy.incidentThresholdNetworkOfflineWindowSeconds}
                onChange={(value) =>
                  setPolicy((current) => ({
                    ...current,
                    incidentThresholdNetworkOfflineWindowSeconds: value,
                  }))
                }
              />
            </div>

            <label className="block space-y-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Disclosure body</span>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-slate-200 px-3 py-2"
                maxLength={1200}
                onChange={(event) =>
                  setPolicy((current) => ({
                    ...current,
                    disclosureBody: event.target.value,
                  }))
                }
                value={policy.disclosureBody ?? ''}
              />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Learner-visible summary</p>
              <p className="mt-2">
                {monitored
                  ? 'Metadata-only monitoring is enabled for this assessment.'
                  : 'Monitoring is off by default for this assessment.'}
              </p>
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

            <button
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              disabled={saving || loading}
              onClick={() => void save()}
              type="button"
            >
              {saving ? 'Saving...' : 'Save security policy'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function NumericField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span className="font-medium text-slate-900">{label}</span>
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2"
        max={3600}
        min={1}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function ToggleField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
      <input
        checked={checked}
        className="accent-slate-900"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
