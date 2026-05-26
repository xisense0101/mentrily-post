import { Injectable } from '@nestjs/common';
import { AppError } from '@mentrily/service-core';
import type {
  ProctoringAttemptSummaryContract,
  ProctoringEventContract,
  ProctoringLearnerDisclosureContract,
  ProctoringSessionContract,
} from '@mentrily/contract-catalog';
import type {
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

  getModeFromAssessmentMetadata(
    metadata: Record<string, unknown> | null | undefined,
  ): ProctoringMode {
    const raw = metadata?.proctoringMode;
    if (raw === 'OFF' || raw === 'BASIC_EVENT_MONITORING' || raw === 'RESERVED_LIVE_MONITORING') {
      return raw;
    }
    return 'OFF';
  }

  buildDisclosure(mode: ProctoringMode): ProctoringLearnerDisclosureContract {
    return {
      mode,
      required: mode !== 'OFF',
      title: mode === 'OFF' ? 'Monitoring disabled' : 'Monitoring disclosure',
      message:
        mode === 'OFF'
          ? 'This attempt does not use monitoring.'
          : 'This attempt records limited browser activity metadata during the assessment. Monitoring is visible and never hidden.',
      visible: true,
      captures:
        mode === 'OFF'
          ? []
          : [
              'Window and tab focus changes',
              'Page visibility changes',
              'Fullscreen entry and exit',
              'Online and offline state',
              'Copy and paste attempt metadata',
            ],
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
    mode: ProctoringMode,
    session?: ProctoringSessionRecord | null,
  ): ProctoringAttemptSummaryContract {
    return {
      enabled: mode !== 'OFF',
      mode,
      required: mode !== 'OFF',
      disclosure: this.buildDisclosure(mode),
      ...(session ? { session: this.toSessionContract(session) } : {}),
    };
  }
}
