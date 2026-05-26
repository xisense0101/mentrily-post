export type ProctoringModeContract = 'OFF' | 'BASIC_EVENT_MONITORING' | 'RESERVED_LIVE_MONITORING';

export type ProctoringSessionStatusContract =
  | 'PENDING'
  | 'ACTIVE'
  | 'ENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type ProctoringEventTypeContract =
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'HEARTBEAT'
  | 'WINDOW_BLUR'
  | 'WINDOW_FOCUS'
  | 'VISIBILITY_HIDDEN'
  | 'VISIBILITY_VISIBLE'
  | 'FULLSCREEN_EXITED'
  | 'FULLSCREEN_ENTERED'
  | 'COPY_ATTEMPTED'
  | 'PASTE_ATTEMPTED'
  | 'NETWORK_OFFLINE'
  | 'NETWORK_ONLINE'
  | 'SUSPICIOUS_ACTIVITY_REPORTED'
  | 'SYSTEM_WARNING';

export type ProctoringEventSeverityContract = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface ProctoringLearnerDisclosureContract {
  mode: ProctoringModeContract;
  required: boolean;
  title: string;
  message: string;
  visible: boolean;
  captures: string[];
  doesNotCapture: string[];
}

export interface ProctoringSessionContract {
  sessionId: string;
  attemptId: string;
  assessmentId: string;
  status: ProctoringSessionStatusContract;
  mode: ProctoringModeContract;
  startedAt: string;
  endedAt?: string | undefined;
  lastHeartbeatAt?: string | undefined;
}

export interface ProctoringAttemptSummaryContract {
  enabled: boolean;
  mode: ProctoringModeContract;
  required: boolean;
  disclosure: ProctoringLearnerDisclosureContract;
  session?: ProctoringSessionContract | undefined;
}

export interface ProctoringEventContract {
  id: string;
  sessionId: string;
  attemptId: string;
  assessmentId: string;
  eventType: ProctoringEventTypeContract;
  severity: ProctoringEventSeverityContract;
  occurredAt: string;
  receivedAt: string;
  message: string;
  metadataSummary: Record<string, unknown>;
}

export interface StartProctoringSessionRequestContract {
  attemptId?: string | undefined;
}

export interface StartProctoringSessionResponseContract {
  summary: ProctoringAttemptSummaryContract;
}

export interface ProctoringHeartbeatRequestContract {
  occurredAt?: string | undefined;
  clientTime?: string | undefined;
  sequence?: number | undefined;
}

export interface RecordProctoringEventRequestContract {
  eventId?: string | undefined;
  eventType: ProctoringEventTypeContract;
  severity?: ProctoringEventSeverityContract | undefined;
  occurredAt?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface RecordProctoringEventResponseContract {
  event: ProctoringEventContract;
  duplicate: boolean;
}

export interface ProctoringAttemptMonitoringTimelineContract {
  attemptId: string;
  assessmentId: string;
  session?: ProctoringSessionContract | undefined;
  disclosure: ProctoringLearnerDisclosureContract;
  events: ProctoringEventContract[];
}

export interface ProctoringAttemptMonitoringSummaryContract {
  assessmentId: string;
  activeCount: number;
  sessions: Array<{
    sessionId: string;
    attemptId: string;
    learnerPrincipalId: string;
    status: ProctoringSessionStatusContract;
    mode: ProctoringModeContract;
    lastHeartbeatAt?: string | undefined;
    highSeverityEvents: number;
    warningEvents: number;
  }>;
}
