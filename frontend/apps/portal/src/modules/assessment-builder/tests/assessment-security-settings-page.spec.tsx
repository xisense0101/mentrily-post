import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentSecuritySettingsPage } from '../routes';
import { changeValue, clickElement, getByLabelText, getByText, render, waitFor } from '@/testing';
import type {
  AssessmentSecurityPolicyContract,
  UpdateAssessmentSecurityPolicyRequestContract,
} from '@mentrily/domain-contracts';

const getAssessmentSecurityPolicy = vi.fn();
const updateAssessmentSecurityPolicy = vi.fn();

vi.mock('@/modules/proctoring/api/proctoring-api-client', () => ({
  proctoringApiClient: {
    getAssessmentSecurityPolicy: (...args: unknown[]) => getAssessmentSecurityPolicy(...args),
    updateAssessmentSecurityPolicy: (...args: unknown[]) => updateAssessmentSecurityPolicy(...args),
  },
}));

const policy: AssessmentSecurityPolicyContract = {
  assessmentId: 'assessment-1',
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
  disclosureTitle: 'Visible disclosure',
  disclosureBody: 'Learner-visible disclosure body',
  updatedAt: '2026-05-28T00:00:00.000Z',
};

function makeSavedPolicy(
  overrides: Partial<UpdateAssessmentSecurityPolicyRequestContract> = {},
): AssessmentSecurityPolicyContract {
  return {
    ...policy,
    ...overrides,
    assessmentId: 'assessment-1',
    updatedAt: '2026-05-28T00:00:00.000Z',
    disclosureTitle: overrides.disclosureTitle ?? policy.disclosureTitle,
    disclosureBody: overrides.disclosureBody ?? policy.disclosureBody,
  };
}

describe('AssessmentSecuritySettingsPage', () => {
  beforeEach(() => {
    getAssessmentSecurityPolicy.mockReset();
    updateAssessmentSecurityPolicy.mockReset();
  });

  it('loads, edits, and saves the policy', async () => {
    getAssessmentSecurityPolicy.mockResolvedValue(policy);
    updateAssessmentSecurityPolicy.mockResolvedValue(
      makeSavedPolicy({ proctoringMode: 'BASIC_EVENT_MONITORING' }),
    );

    const rendered = await render(<AssessmentSecuritySettingsPage assessmentId="assessment-1" />);

    await waitFor(() => {
      expect(getAssessmentSecurityPolicy).toHaveBeenCalledWith('assessment-1');
    });

    expect(getByText(rendered.container, 'Metadata-only monitoring')).toBeTruthy();
    expect(getByText(rendered.container, 'No webcam, screen, or audio recording')).toBeTruthy();

    const modeSelect = getByLabelText(rendered.container, 'Proctoring mode');
    await changeValue(modeSelect, 'BASIC_EVENT_MONITORING');
    await changeValue(getByLabelText(rendered.container, 'Disclosure title'), 'Visible disclosure');
    await changeValue(
      getByLabelText(rendered.container, 'Disclosure body'),
      'Learner-visible disclosure body',
    );

    await clickElement(getByText(rendered.container, 'Save security policy'));

    await waitFor(() => {
      expect(updateAssessmentSecurityPolicy).toHaveBeenCalledWith(
        'assessment-1',
        expect.objectContaining({
          proctoringMode: 'BASIC_EVENT_MONITORING',
          disclosureTitle: 'Visible disclosure',
          disclosureBody: 'Learner-visible disclosure body',
        }),
      );
    });

    expect(getByText(rendered.container, 'Security policy saved.')).toBeTruthy();
  });

  it('shows a load error state', async () => {
    getAssessmentSecurityPolicy.mockRejectedValue(new Error('Forbidden'));

    const rendered = await render(<AssessmentSecuritySettingsPage assessmentId="assessment-1" />);

    await waitFor(() => {
      expect(getByText(rendered.container, 'Forbidden')).toBeTruthy();
    });
  });
});
