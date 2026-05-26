import type {
  AssessmentProctoringEventSeverity,
  AssessmentProctoringEventType,
  AssessmentProctoringMode,
  AssessmentProctoringSessionStatus,
} from '@prisma/client';

export type ProctoringMode = AssessmentProctoringMode;
export type ProctoringSessionStatus = AssessmentProctoringSessionStatus;
export type ProctoringEventType = AssessmentProctoringEventType;
export type ProctoringEventSeverity = AssessmentProctoringEventSeverity;

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
