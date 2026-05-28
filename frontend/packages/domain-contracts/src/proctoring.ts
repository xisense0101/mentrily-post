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

export interface AssessmentSecurityPolicyContract {
  assessmentId: string;
  proctoringMode: ProctoringModeContract;
  requireDisclosureAcknowledgement: boolean;
  requireFullscreen: boolean;
  trackFocusChanges: boolean;
  trackVisibilityChanges: boolean;
  trackFullscreenChanges: boolean;
  trackCopyPasteAttempts: boolean;
  trackNetworkStatus: boolean;
  heartbeatIntervalSeconds: number;
  incidentThresholdFocusLossCount: number;
  incidentThresholdFocusLossWindowSeconds: number;
  incidentThresholdVisibilityHiddenCount: number;
  incidentThresholdVisibilityHiddenWindowSeconds: number;
  incidentThresholdNetworkOfflineCount: number;
  incidentThresholdNetworkOfflineWindowSeconds: number;
  disclosureTitle?: string | undefined;
  disclosureBody?: string | undefined;
  updatedAt?: string | undefined;
}

export interface UpdateAssessmentSecurityPolicyRequestContract {
  proctoringMode: ProctoringModeContract;
  requireDisclosureAcknowledgement: boolean;
  requireFullscreen: boolean;
  trackFocusChanges: boolean;
  trackVisibilityChanges: boolean;
  trackFullscreenChanges: boolean;
  trackCopyPasteAttempts: boolean;
  trackNetworkStatus: boolean;
  heartbeatIntervalSeconds: number;
  incidentThresholdFocusLossCount: number;
  incidentThresholdFocusLossWindowSeconds: number;
  incidentThresholdVisibilityHiddenCount: number;
  incidentThresholdVisibilityHiddenWindowSeconds: number;
  incidentThresholdNetworkOfflineCount: number;
  incidentThresholdNetworkOfflineWindowSeconds: number;
  disclosureTitle?: string | null | undefined;
  disclosureBody?: string | null | undefined;
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
  policy?: AssessmentSecurityPolicyContract | undefined;
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

export type ProctoringIncidentTypeContract =
  | 'FOCUS_LOSS'
  | 'FULLSCREEN_EXIT'
  | 'COPY_PASTE_ACTIVITY'
  | 'CONNECTIVITY_INTERRUPTION'
  | 'SESSION_INTERRUPTION'
  | 'MULTIPLE_WARNINGS'
  | 'HIGH_SEVERITY_EVENT'
  | 'SYSTEM_FLAG'
  | 'MANUAL_REVIEW_FLAG';

export type ProctoringIncidentStatusContract =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'ESCALATED';

export type ProctoringIncidentSeverityContract = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProctoringIncidentReviewActionTypeContract =
  | 'OPENED'
  | 'MARKED_IN_REVIEW'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'ESCALATED'
  | 'REOPENED'
  | 'NOTE_ADDED';

export interface ProctoringIncidentContract {
  id: string;
  sessionId: string;
  attemptId: string;
  assessmentId: string;
  learnerPrincipalId: string;
  learnerDisplayName?: string | undefined;
  incidentType: ProctoringIncidentTypeContract;
  severity: ProctoringIncidentSeverityContract;
  status: ProctoringIncidentStatusContract;
  title: string;
  summary: string;
  firstEventAt: string;
  lastEventAt: string;
  eventCount: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | undefined;
  reviewedByPrincipalId?: string | undefined;
  reviewedByDisplayName?: string | undefined;
  resolvedAt?: string | undefined;
  resolution?: string | undefined;
}

export interface ProctoringIncidentReviewActionContract {
  id: string;
  incidentId: string;
  actionType: ProctoringIncidentReviewActionTypeContract;
  actorPrincipalId: string;
  actorDisplayName?: string | undefined;
  note?: string | undefined;
  createdAt: string;
}

export interface ProctoringIncidentDetailContract {
  incident: ProctoringIncidentContract;
  events: ProctoringEventContract[];
  reviewActions: ProctoringIncidentReviewActionContract[];
}

export interface ProctoringIncidentSummaryContract {
  openCount: number;
  highSeverityCount: number;
  inReviewCount: number;
  resolvedDismissedCount: number;
  attemptsWithIncidentsCount: number;
}

export interface ProctoringIncidentListQueryContract {
  assessmentId?: string | undefined;
  attemptId?: string | undefined;
  status?: ProctoringIncidentStatusContract | undefined;
  severity?: ProctoringIncidentSeverityContract | undefined;
}

export interface ProctoringIncidentListResponseContract {
  incidents: ProctoringIncidentContract[];
}

export interface UpdateProctoringIncidentStatusRequestContract {
  status: ProctoringIncidentStatusContract;
  note?: string | undefined;
}

export interface AddProctoringIncidentNoteRequestContract {
  note: string;
}

export interface CreateManualProctoringIncidentRequestContract {
  sessionId: string;
  attemptId: string;
  assessmentId: string;
  learnerPrincipalId: string;
  incidentType: ProctoringIncidentTypeContract;
  severity: ProctoringIncidentSeverityContract;
  title: string;
  summary: string;
  note?: string | undefined;
}
