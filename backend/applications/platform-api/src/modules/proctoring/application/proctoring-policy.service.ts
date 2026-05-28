import { Injectable } from '@nestjs/common';
import { AppError } from '@mentrily/service-core';
import type {
  AssessmentSecurityPolicyContract,
  ProctoringAttemptSummaryContract,
  ProctoringEventContract,
  ProctoringLearnerDisclosureContract,
  ProctoringSessionContract,
  SecurityPolicyRuntimeStateContract,
  UpdateAssessmentSecurityPolicyRequestContract,
} from '@mentrily/contract-catalog';
import type {
  AssessmentSecurityPolicyConfig,
  AssessmentSecurityPolicyRecord,
  ProctoringEventRecord,
  ProctoringEventSeverity,
  ProctoringEventType,
  ProctoringMode,
  ProctoringSessionRecord,
} from './proctoring.types.js';

const ALLOWED_EVENT_TYPES: ReadonlySet<ProctoringEventType> = new Set([
  'SESSION_STARTED',
  'SESSION_ENDED',
  'HEARTBEAT',
  'WINDOW_BLUR',
  'WINDOW_FOCUS',
  'VISIBILITY_HIDDEN',
  'VISIBILITY_VISIBLE',
  'FULLSCREEN_EXITED',
  'FULLSCREEN_ENTERED',
  'COPY_ATTEMPTED',
  'PASTE_ATTEMPTED',
  'NETWORK_OFFLINE',
  'NETWORK_ONLINE',
  'SUSPICIOUS_ACTIVITY_REPORTED',
  'SYSTEM_WARNING',
]);

const ALLOWED_SEVERITIES: ReadonlySet<ProctoringEventSeverity> = new Set([
  'INFO',
  'LOW',
  'MEDIUM',
  'HIGH',
]);

const ALLOWED_METADATA_KEYS: Readonly<Record<ProctoringEventType, ReadonlySet<string>>> = {
  SESSION_STARTED: new Set(['clientTime', 'sequence']),
  SESSION_ENDED: new Set(['clientTime', 'sequence']),
  HEARTBEAT: new Set(['clientTime', 'sequence']),
  WINDOW_BLUR: new Set(['clientTime', 'sequence']),
  WINDOW_FOCUS: new Set(['clientTime', 'sequence']),
  VISIBILITY_HIDDEN: new Set(['clientTime', 'sequence']),
  VISIBILITY_VISIBLE: new Set(['clientTime', 'sequence']),
  FULLSCREEN_EXITED: new Set(['clientTime', 'sequence']),
  FULLSCREEN_ENTERED: new Set(['clientTime', 'sequence']),
  NETWORK_OFFLINE: new Set(['clientTime', 'sequence']),
  NETWORK_ONLINE: new Set(['clientTime', 'sequence']),
  COPY_ATTEMPTED: new Set(['clientTime', 'sequence', 'questionId']),
  PASTE_ATTEMPTED: new Set(['clientTime', 'sequence', 'questionId']),
  SUSPICIOUS_ACTIVITY_REPORTED: new Set(['clientTime', 'sequence', 'message']),
  SYSTEM_WARNING: new Set(['clientTime', 'sequence', 'message']),
};

@Injectable()
export class ProctoringPolicyService {
  readonly maxMetadataBytes = 512;
  readonly maxEventsPerMinute = 40;
  readonly minHeartbeatIntervalSeconds = 15;
  readonly maxHeartbeatIntervalSeconds = 120;
  readonly minIncidentThresholdCount = 1;
  readonly maxIncidentThresholdCount = 10;
  readonly minIncidentThresholdWindowSeconds = 60;
  readonly maxIncidentThresholdWindowSeconds = 3600;
  readonly maxDisclosureTitleLength = 120;
  readonly maxDisclosureBodyLength = 1200;

  createDefaultPolicy(assessmentId: string): AssessmentSecurityPolicyConfig {
    return {
      assessmentId,
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
  }

  getModeFromAssessmentMetadata(
    metadata: Record<string, unknown> | null | undefined,
  ): ProctoringMode {
    const raw = metadata?.proctoringMode;
    if (raw === 'OFF' || raw === 'BASIC_EVENT_MONITORING' || raw === 'RESERVED_LIVE_MONITORING') {
      return raw;
    }
    return 'OFF';
  }

  fromRecord(record: AssessmentSecurityPolicyRecord): AssessmentSecurityPolicyConfig {
    return {
      assessmentId: record.assessmentId,
      proctoringMode: record.proctoringMode,
      requireDisclosureAcknowledgement: record.requireDisclosureAcknowledgement,
      requireFullscreen: record.requireFullscreen,
      trackFocusChanges: record.trackFocusChanges,
      trackVisibilityChanges: record.trackVisibilityChanges,
      trackFullscreenChanges: record.trackFullscreenChanges,
      trackCopyPasteAttempts: record.trackCopyPasteAttempts,
      trackNetworkStatus: record.trackNetworkStatus,
      heartbeatIntervalSeconds: record.heartbeatIntervalSeconds,
      incidentThresholdFocusLossCount: record.incidentThresholdFocusLossCount,
      incidentThresholdFocusLossWindowSeconds: record.incidentThresholdFocusLossWindowSeconds,
      incidentThresholdVisibilityHiddenCount: record.incidentThresholdVisibilityHiddenCount,
      incidentThresholdVisibilityHiddenWindowSeconds:
        record.incidentThresholdVisibilityHiddenWindowSeconds,
      incidentThresholdNetworkOfflineCount: record.incidentThresholdNetworkOfflineCount,
      incidentThresholdNetworkOfflineWindowSeconds:
        record.incidentThresholdNetworkOfflineWindowSeconds,
      disclosureTitle: record.disclosureTitle,
      disclosureBody: record.disclosureBody,
      updatedAt: record.updatedAt,
    };
  }

  validateUpdate(
    assessmentId: string,
    input: UpdateAssessmentSecurityPolicyRequestContract,
  ): AssessmentSecurityPolicyConfig {
    const base = this.createDefaultPolicy(assessmentId);
    const mode = input.proctoringMode;
    if (
      mode !== 'OFF' &&
      mode !== 'BASIC_EVENT_MONITORING' &&
      mode !== 'RESERVED_LIVE_MONITORING'
    ) {
      throw new AppError('VALIDATION_ERROR', 'invalid proctoring mode', 400);
    }

    const heartbeatIntervalSeconds = this.validateBoundedNumber(
      input.heartbeatIntervalSeconds,
      this.minHeartbeatIntervalSeconds,
      this.maxHeartbeatIntervalSeconds,
      'invalid heartbeat interval',
    );
    const incidentThresholdFocusLossCount = this.validateBoundedNumber(
      input.incidentThresholdFocusLossCount,
      this.minIncidentThresholdCount,
      this.maxIncidentThresholdCount,
      'invalid focus loss threshold count',
    );
    const incidentThresholdFocusLossWindowSeconds = this.validateBoundedNumber(
      input.incidentThresholdFocusLossWindowSeconds,
      this.minIncidentThresholdWindowSeconds,
      this.maxIncidentThresholdWindowSeconds,
      'invalid focus loss threshold window',
    );
    const incidentThresholdVisibilityHiddenCount = this.validateBoundedNumber(
      input.incidentThresholdVisibilityHiddenCount,
      this.minIncidentThresholdCount,
      this.maxIncidentThresholdCount,
      'invalid visibility threshold count',
    );
    const incidentThresholdVisibilityHiddenWindowSeconds = this.validateBoundedNumber(
      input.incidentThresholdVisibilityHiddenWindowSeconds,
      this.minIncidentThresholdWindowSeconds,
      this.maxIncidentThresholdWindowSeconds,
      'invalid visibility threshold window',
    );
    const incidentThresholdNetworkOfflineCount = this.validateBoundedNumber(
      input.incidentThresholdNetworkOfflineCount,
      this.minIncidentThresholdCount,
      this.maxIncidentThresholdCount,
      'invalid network threshold count',
    );
    const incidentThresholdNetworkOfflineWindowSeconds = this.validateBoundedNumber(
      input.incidentThresholdNetworkOfflineWindowSeconds,
      this.minIncidentThresholdWindowSeconds,
      this.maxIncidentThresholdWindowSeconds,
      'invalid network threshold window',
    );

    const disclosureTitle = this.normalizeDisclosureText(
      input.disclosureTitle,
      this.maxDisclosureTitleLength,
      'invalid disclosure title',
    );
    const disclosureBody = this.normalizeDisclosureText(
      input.disclosureBody,
      this.maxDisclosureBodyLength,
      'invalid disclosure body',
    );

    return {
      ...base,
      proctoringMode: mode,
      requireDisclosureAcknowledgement: input.requireDisclosureAcknowledgement,
      requireFullscreen: input.requireFullscreen,
      trackFocusChanges: input.trackFocusChanges,
      trackVisibilityChanges: input.trackVisibilityChanges,
      trackFullscreenChanges: input.trackFullscreenChanges,
      trackCopyPasteAttempts: input.trackCopyPasteAttempts,
      trackNetworkStatus: input.trackNetworkStatus,
      heartbeatIntervalSeconds,
      incidentThresholdFocusLossCount,
      incidentThresholdFocusLossWindowSeconds,
      incidentThresholdVisibilityHiddenCount,
      incidentThresholdVisibilityHiddenWindowSeconds,
      incidentThresholdNetworkOfflineCount,
      incidentThresholdNetworkOfflineWindowSeconds,
      ...(disclosureTitle !== undefined ? { disclosureTitle } : {}),
      ...(disclosureBody !== undefined ? { disclosureBody } : {}),
    };
  }

  toContract(policy: AssessmentSecurityPolicyConfig): AssessmentSecurityPolicyContract {
    return {
      assessmentId: policy.assessmentId,
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
      ...(policy.disclosureTitle ? { disclosureTitle: policy.disclosureTitle } : {}),
      ...(policy.disclosureBody ? { disclosureBody: policy.disclosureBody } : {}),
      ...(policy.updatedAt ? { updatedAt: policy.updatedAt.toISOString() } : {}),
    };
  }

  buildDisclosure(
    input: AssessmentSecurityPolicyConfig | ProctoringMode,
  ): ProctoringLearnerDisclosureContract {
    const policy =
      typeof input === 'string'
        ? {
            ...this.createDefaultPolicy('default'),
            proctoringMode: input,
          }
        : input;
    const mode = policy.proctoringMode;
    const captures =
      mode === 'OFF'
        ? []
        : [
            ...(policy.trackFocusChanges ? ['Window and tab focus changes'] : []),
            ...(policy.trackVisibilityChanges ? ['Page visibility changes'] : []),
            ...(policy.trackFullscreenChanges ? ['Fullscreen entry and exit'] : []),
            ...(policy.trackNetworkStatus ? ['Online and offline state'] : []),
            ...(policy.trackCopyPasteAttempts ? ['Copy and paste attempt metadata'] : []),
          ];

    return {
      mode,
      required: mode !== 'OFF',
      title:
        policy.disclosureTitle?.trim() ||
        (mode === 'OFF' ? 'Monitoring disabled' : 'Metadata-only monitoring disclosure'),
      message:
        policy.disclosureBody?.trim() ||
        (mode === 'OFF'
          ? 'This attempt does not use monitoring.'
          : 'Metadata-only monitoring is enabled for this attempt. No webcam, screen, or audio recording is used, and monitoring is always visible.'),
      visible: true,
      captures,
      doesNotCapture: [
        'Clipboard contents',
        'Raw keystrokes',
        'Webcam video',
        'Screen recordings',
        'Audio recordings',
        'Biometric identity data',
      ],
    };
  }

  isEventTypeAllowed(eventType: ProctoringEventType): boolean {
    return ALLOWED_EVENT_TYPES.has(eventType);
  }

  isSeverityAllowed(severity: ProctoringEventSeverity): boolean {
    return ALLOWED_SEVERITIES.has(severity);
  }

  sanitizeMetadata(
    eventType: ProctoringEventType,
    metadata: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    const allowedKeys = ALLOWED_METADATA_KEYS[eventType] ?? new Set<string>();
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata ?? {})) {
      if (!allowedKeys.has(key)) {
        continue;
      }

      if (key === 'questionId') {
        if (typeof value !== 'string' || value.length > 128) {
          throw new AppError('VALIDATION_ERROR', 'invalid questionId', 400);
        }
        sanitized[key] = value;
        continue;
      }

      if (key === 'sequence') {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
          throw new AppError('VALIDATION_ERROR', 'invalid sequence', 400);
        }
        sanitized[key] = Math.floor(value);
        continue;
      }

      if (key === 'clientTime' || key === 'message') {
        if (typeof value !== 'string' || value.length > 160) {
          throw new AppError('VALIDATION_ERROR', `invalid ${key}`, 400);
        }
        sanitized[key] = value;
      }
    }

    if (JSON.stringify(sanitized).length > this.maxMetadataBytes) {
      throw new AppError('VALIDATION_ERROR', 'metadata exceeds maximum size', 400);
    }

    return sanitized;
  }

  getSafeEventMessage(eventType: ProctoringEventType): string {
    switch (eventType) {
      case 'SESSION_STARTED':
        return 'Monitoring session started';
      case 'SESSION_ENDED':
        return 'Monitoring session ended';
      case 'HEARTBEAT':
        return 'Heartbeat received';
      case 'WINDOW_BLUR':
        return 'Assessment window lost focus';
      case 'WINDOW_FOCUS':
        return 'Assessment window regained focus';
      case 'VISIBILITY_HIDDEN':
        return 'Assessment tab became hidden';
      case 'VISIBILITY_VISIBLE':
        return 'Assessment tab became visible';
      case 'FULLSCREEN_EXITED':
        return 'Fullscreen mode exited';
      case 'FULLSCREEN_ENTERED':
        return 'Fullscreen mode entered';
      case 'COPY_ATTEMPTED':
        return 'Copy attempt recorded';
      case 'PASTE_ATTEMPTED':
        return 'Paste attempt recorded';
      case 'NETWORK_OFFLINE':
        return 'Device went offline';
      case 'NETWORK_ONLINE':
        return 'Device came back online';
      case 'SUSPICIOUS_ACTIVITY_REPORTED':
        return 'Suspicious activity was reported';
      case 'SYSTEM_WARNING':
        return 'A system warning was recorded';
    }
    return 'Monitoring event recorded';
  }

  toSessionContract(session: ProctoringSessionRecord): ProctoringSessionContract {
    return {
      sessionId: session.id,
      attemptId: session.attemptId,
      assessmentId: session.assessmentId,
      status: session.status,
      mode: session.mode,
      startedAt: session.startedAt.toISOString(),
      ...(session.endedAt ? { endedAt: session.endedAt.toISOString() } : {}),
      ...(session.lastHeartbeatAt
        ? { lastHeartbeatAt: session.lastHeartbeatAt.toISOString() }
        : {}),
    };
  }

  toEventContract(event: ProctoringEventRecord): ProctoringEventContract {
    return {
      id: event.id,
      sessionId: event.sessionId,
      attemptId: event.attemptId,
      assessmentId: event.assessmentId,
      eventType: event.eventType,
      severity: event.severity,
      occurredAt: event.occurredAt.toISOString(),
      receivedAt: event.receivedAt.toISOString(),
      message: this.getSafeEventMessage(event.eventType),
      metadataSummary: { ...event.metadata },
    };
  }

  toAttemptSummary(
    policy: AssessmentSecurityPolicyConfig,
    session?: ProctoringSessionRecord | null,
  ): ProctoringAttemptSummaryContract {
    return {
      enabled: policy.proctoringMode !== 'OFF',
      mode: policy.proctoringMode,
      required: policy.proctoringMode !== 'OFF',
      disclosure: this.buildDisclosure(policy),
      policy: this.toContract(policy),
      ...(session ? { session: this.toSessionContract(session) } : {}),
    };
  }

  /**
   * Build the learner-safe runtime security state for a given policy and attempt/acknowledgement context.
   * disclosureAcknowledged: true when the learner has sent acknowledgeDisclosure=true in the current request
   * fullscreenSatisfied: true when the learner has sent fullscreenSatisfied=true in the current request
   */
  buildSecurityRuntimeState({
    policy,
    disclosureAcknowledged,
    fullscreenSatisfied,
  }: {
    policy: AssessmentSecurityPolicyConfig;
    disclosureAcknowledged: boolean;
    fullscreenSatisfied: boolean;
  }): SecurityPolicyRuntimeStateContract {
    const mode = policy.proctoringMode;
    const monitoringEnabled = mode !== 'OFF';
    const disclosureRequired = monitoringEnabled && policy.requireDisclosureAcknowledgement;
    const fullscreenRequired = monitoringEnabled && policy.requireFullscreen;

    const blockedReasons: SecurityPolicyRuntimeStateContract['blockedReasons'] = [];
    if (!monitoringEnabled) {
      blockedReasons.push('MONITORING_POLICY_DISABLED');
    }
    if (disclosureRequired && !disclosureAcknowledged) {
      blockedReasons.push('DISCLOSURE_ACKNOWLEDGEMENT_REQUIRED');
    }
    if (fullscreenRequired && !fullscreenSatisfied) {
      blockedReasons.push('FULLSCREEN_REQUIRED');
    }

    const canStartMonitoring = blockedReasons.length === 0;
    const disclosure = this.buildDisclosure(policy);

    return {
      proctoringMode: mode,
      disclosureRequired,
      disclosureAcknowledged,
      fullscreenRequired,
      fullscreenSatisfied,
      canStartAttempt: true, // attempt start is not gated by proctoring policy
      canStartMonitoring,
      blockedReasons,
      enabledEventCategories: this.getEnabledEventCategories(policy),
      disclosureTitle: disclosure.title,
      disclosureBody: disclosure.message,
    };
  }

  /**
   * Returns the list of enabled event category names based on policy flags.
   */
  getEnabledEventCategories(policy: AssessmentSecurityPolicyConfig): string[] {
    if (policy.proctoringMode === 'OFF') {
      return [];
    }
    const categories: string[] = ['heartbeat'];
    if (policy.trackFocusChanges) categories.push('trackFocusChanges');
    if (policy.trackVisibilityChanges) categories.push('trackVisibilityChanges');
    if (policy.trackFullscreenChanges) categories.push('trackFullscreenChanges');
    if (policy.trackCopyPasteAttempts) categories.push('trackCopyPasteAttempts');
    if (policy.trackNetworkStatus) categories.push('trackNetworkStatus');
    return categories;
  }

  /**
   * Checks whether a given proctoring event type is allowed by the active policy.
   * In addition to the global allowlist, category-specific flags must be enabled.
   */
  isEventTypeAllowedByPolicy(
    eventType: ProctoringEventType,
    policy: AssessmentSecurityPolicyConfig,
  ): boolean {
    if (!this.isEventTypeAllowed(eventType)) {
      return false;
    }
    if (policy.proctoringMode === 'OFF') {
      return false;
    }
    // Session lifecycle and heartbeat events are always allowed when mode is not OFF
    if (
      eventType === 'SESSION_STARTED' ||
      eventType === 'SESSION_ENDED' ||
      eventType === 'HEARTBEAT' ||
      eventType === 'SUSPICIOUS_ACTIVITY_REPORTED' ||
      eventType === 'SYSTEM_WARNING'
    ) {
      return true;
    }
    // Focus-change events
    if (eventType === 'WINDOW_BLUR' || eventType === 'WINDOW_FOCUS') {
      return policy.trackFocusChanges;
    }
    // Visibility events
    if (eventType === 'VISIBILITY_HIDDEN' || eventType === 'VISIBILITY_VISIBLE') {
      return policy.trackVisibilityChanges;
    }
    // Fullscreen events
    if (eventType === 'FULLSCREEN_EXITED' || eventType === 'FULLSCREEN_ENTERED') {
      return policy.trackFullscreenChanges;
    }
    // Copy/paste events
    if (eventType === 'COPY_ATTEMPTED' || eventType === 'PASTE_ATTEMPTED') {
      return policy.trackCopyPasteAttempts;
    }
    // Network events
    if (eventType === 'NETWORK_OFFLINE' || eventType === 'NETWORK_ONLINE') {
      return policy.trackNetworkStatus;
    }
    return false;
  }

  private validateBoundedNumber(value: number, min: number, max: number, message: string): number {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new AppError('VALIDATION_ERROR', message, 400);
    }
    return value;
  }

  private normalizeDisclosureText(
    value: string | null | undefined,
    maxLength: number,
    message: string,
  ): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value !== 'string') {
      throw new AppError('VALIDATION_ERROR', message, 400);
    }
    const normalized = value.trim();
    if (normalized.length === 0) {
      return undefined;
    }
    if (normalized.length > maxLength) {
      throw new AppError('VALIDATION_ERROR', message, 400);
    }
    return normalized;
  }
}
