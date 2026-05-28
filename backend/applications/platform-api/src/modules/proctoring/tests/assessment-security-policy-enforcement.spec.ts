/**
 * Tests for assessment security policy enforcement and attempt gating (014I).
 * Unit tests — no database required.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProctoringPolicyService } from '../application/proctoring-policy.service.js';
import type { AssessmentSecurityPolicyConfig } from '../application/proctoring.types.js';

function makePolicy(
  overrides: Partial<AssessmentSecurityPolicyConfig> = {},
): AssessmentSecurityPolicyConfig {
  const base = new ProctoringPolicyService().createDefaultPolicy('assess-1');
  return { ...base, ...overrides };
}

describe('ProctoringPolicyService — enforcement model', () => {
  let service: ProctoringPolicyService;

  beforeEach(() => {
    service = new ProctoringPolicyService();
  });

  // ────────────────────────────────────────────────────────────────
  // buildSecurityRuntimeState
  // ────────────────────────────────────────────────────────────────

  describe('buildSecurityRuntimeState', () => {
    it('OFF mode → MONITORING_POLICY_DISABLED, canStartMonitoring=false', () => {
      const policy = makePolicy({ proctoringMode: 'OFF' });
      const state = service.buildSecurityRuntimeState({
        policy,
        disclosureAcknowledged: false,
        fullscreenSatisfied: false,
      });
      expect(state.proctoringMode).toBe('OFF');
      expect(state.canStartMonitoring).toBe(false);
      expect(state.blockedReasons).toContain('MONITORING_POLICY_DISABLED');
      expect(state.enabledEventCategories).toEqual([]);
    });

    it('BASIC_EVENT_MONITORING without disclosure → DISCLOSURE_ACKNOWLEDGEMENT_REQUIRED', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        requireDisclosureAcknowledgement: true,
      });
      const state = service.buildSecurityRuntimeState({
        policy,
        disclosureAcknowledged: false,
        fullscreenSatisfied: false,
      });
      expect(state.canStartMonitoring).toBe(false);
      expect(state.blockedReasons).toContain('DISCLOSURE_ACKNOWLEDGEMENT_REQUIRED');
    });

    it('BASIC_EVENT_MONITORING with disclosure → not blocked by disclosure', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        requireDisclosureAcknowledgement: true,
        requireFullscreen: false,
      });
      const state = service.buildSecurityRuntimeState({
        policy,
        disclosureAcknowledged: true,
        fullscreenSatisfied: false,
      });
      expect(state.canStartMonitoring).toBe(true);
      expect(state.blockedReasons).not.toContain('DISCLOSURE_ACKNOWLEDGEMENT_REQUIRED');
    });

    it('requireFullscreen=true, fullscreenSatisfied=false → FULLSCREEN_REQUIRED', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        requireDisclosureAcknowledgement: false,
        requireFullscreen: true,
      });
      const state = service.buildSecurityRuntimeState({
        policy,
        disclosureAcknowledged: false,
        fullscreenSatisfied: false,
      });
      expect(state.canStartMonitoring).toBe(false);
      expect(state.blockedReasons).toContain('FULLSCREEN_REQUIRED');
    });

    it('requireFullscreen=true, fullscreenSatisfied=true → not blocked', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        requireDisclosureAcknowledgement: false,
        requireFullscreen: true,
      });
      const state = service.buildSecurityRuntimeState({
        policy,
        disclosureAcknowledged: false,
        fullscreenSatisfied: true,
      });
      expect(state.canStartMonitoring).toBe(true);
      expect(state.blockedReasons).toHaveLength(0);
    });

    it('both gates required, neither satisfied → both blocked reasons', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        requireDisclosureAcknowledgement: true,
        requireFullscreen: true,
      });
      const state = service.buildSecurityRuntimeState({
        policy,
        disclosureAcknowledged: false,
        fullscreenSatisfied: false,
      });
      expect(state.blockedReasons).toContain('DISCLOSURE_ACKNOWLEDGEMENT_REQUIRED');
      expect(state.blockedReasons).toContain('FULLSCREEN_REQUIRED');
    });

    it('canStartAttempt is always true — attempt start not gated by proctoring', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        requireDisclosureAcknowledgement: true,
      });
      const state = service.buildSecurityRuntimeState({
        policy,
        disclosureAcknowledged: false,
        fullscreenSatisfied: false,
      });
      expect(state.canStartAttempt).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // getEnabledEventCategories
  // ────────────────────────────────────────────────────────────────

  describe('getEnabledEventCategories', () => {
    it('OFF mode → empty categories', () => {
      const policy = makePolicy({ proctoringMode: 'OFF' });
      expect(service.getEnabledEventCategories(policy)).toEqual([]);
    });

    it('BASIC_EVENT_MONITORING, all flags enabled → all categories', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        trackFocusChanges: true,
        trackVisibilityChanges: true,
        trackFullscreenChanges: true,
        trackCopyPasteAttempts: true,
        trackNetworkStatus: true,
      });
      const cats = service.getEnabledEventCategories(policy);
      expect(cats).toContain('heartbeat');
      expect(cats).toContain('trackFocusChanges');
      expect(cats).toContain('trackVisibilityChanges');
      expect(cats).toContain('trackFullscreenChanges');
      expect(cats).toContain('trackCopyPasteAttempts');
      expect(cats).toContain('trackNetworkStatus');
    });

    it('BASIC_EVENT_MONITORING, focus disabled → no trackFocusChanges', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        trackFocusChanges: false,
      });
      expect(service.getEnabledEventCategories(policy)).not.toContain('trackFocusChanges');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // isEventTypeAllowedByPolicy
  // ────────────────────────────────────────────────────────────────

  describe('isEventTypeAllowedByPolicy', () => {
    it('OFF mode → no event type is allowed', () => {
      const policy = makePolicy({ proctoringMode: 'OFF' });
      expect(service.isEventTypeAllowedByPolicy('HEARTBEAT', policy)).toBe(false);
      expect(service.isEventTypeAllowedByPolicy('WINDOW_BLUR', policy)).toBe(false);
      expect(service.isEventTypeAllowedByPolicy('COPY_ATTEMPTED', policy)).toBe(false);
    });

    it('BASIC_EVENT_MONITORING, heartbeat always allowed', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        trackFocusChanges: false,
      });
      expect(service.isEventTypeAllowedByPolicy('HEARTBEAT', policy)).toBe(true);
    });

    it('focus tracking disabled → WINDOW_BLUR rejected', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        trackFocusChanges: false,
      });
      expect(service.isEventTypeAllowedByPolicy('WINDOW_BLUR', policy)).toBe(false);
      expect(service.isEventTypeAllowedByPolicy('WINDOW_FOCUS', policy)).toBe(false);
    });

    it('focus tracking enabled → WINDOW_BLUR allowed', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        trackFocusChanges: true,
      });
      expect(service.isEventTypeAllowedByPolicy('WINDOW_BLUR', policy)).toBe(true);
    });

    it('visibility tracking disabled → VISIBILITY_HIDDEN rejected', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        trackVisibilityChanges: false,
      });
      expect(service.isEventTypeAllowedByPolicy('VISIBILITY_HIDDEN', policy)).toBe(false);
    });

    it('fullscreen tracking disabled → FULLSCREEN_EXITED rejected', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        trackFullscreenChanges: false,
      });
      expect(service.isEventTypeAllowedByPolicy('FULLSCREEN_EXITED', policy)).toBe(false);
    });

    it('copy-paste tracking disabled → COPY_ATTEMPTED rejected', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        trackCopyPasteAttempts: false,
      });
      expect(service.isEventTypeAllowedByPolicy('COPY_ATTEMPTED', policy)).toBe(false);
      expect(service.isEventTypeAllowedByPolicy('PASTE_ATTEMPTED', policy)).toBe(false);
    });

    it('network tracking disabled → NETWORK_OFFLINE rejected', () => {
      const policy = makePolicy({
        proctoringMode: 'BASIC_EVENT_MONITORING',
        trackNetworkStatus: false,
      });
      expect(service.isEventTypeAllowedByPolicy('NETWORK_OFFLINE', policy)).toBe(false);
    });

    it('SUSPICIOUS_ACTIVITY_REPORTED always allowed in BASIC_EVENT_MONITORING', () => {
      const policy = makePolicy({ proctoringMode: 'BASIC_EVENT_MONITORING' });
      expect(service.isEventTypeAllowedByPolicy('SUSPICIOUS_ACTIVITY_REPORTED', policy)).toBe(true);
    });
  });
});
