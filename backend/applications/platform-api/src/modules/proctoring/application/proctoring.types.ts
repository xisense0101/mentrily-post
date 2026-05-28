import type {
  AssessmentSecurityPolicy as PrismaAssessmentSecurityPolicy,
  AssessmentProctoringEventSeverity,
  AssessmentProctoringEventType,
  AssessmentProctoringMode,
  AssessmentProctoringSessionStatus,
} from '@prisma/client';

export type ProctoringMode = AssessmentProctoringMode;
export type ProctoringSessionStatus = AssessmentProctoringSessionStatus;
export type ProctoringEventType = AssessmentProctoringEventType;
export type ProctoringEventSeverity = AssessmentProctoringEventSeverity;
export type AssessmentSecurityPolicyRecord = PrismaAssessmentSecurityPolicy;

export interface ProctoringSessionRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  assessmentId: string;
  attemptId: string;
  learnerPrincipalId: string;
  mode: ProctoringMode;
  status: ProctoringSessionStatus;
  startedAt: Date;
  endedAt?: Date | null;
  lastHeartbeatAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProctoringEventRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  sessionId: string;
  attemptId: string;
  assessmentId: string;
  learnerPrincipalId: string;
  eventId?: string | null;
  eventType: ProctoringEventType;
  severity: ProctoringEventSeverity;
  occurredAt: Date;
  receivedAt: Date;
  metadata: Record<string, unknown>;
}

export interface AssessmentSecurityPolicyConfig {
  assessmentId: string;
  proctoringMode: ProctoringMode;
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
  disclosureTitle?: string | null;
  disclosureBody?: string | null;
  updatedAt?: Date;
}
