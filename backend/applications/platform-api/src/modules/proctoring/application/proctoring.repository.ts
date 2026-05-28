import { TransactionContext } from '@mentrily/service-core';
import {
  AssessmentSecurityPolicyConfig,
  AssessmentSecurityPolicyRecord,
  ProctoringEventRecord,
  ProctoringEventSeverity,
  ProctoringEventType,
  ProctoringMode,
  ProctoringSessionRecord,
  ProctoringSessionStatus,
} from './proctoring.types.js';

export abstract class AssessmentSecurityPolicyRepository {
  abstract findByAssessmentId(
    workspaceId: string,
    assessmentId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentSecurityPolicyRecord | null>;

  abstract upsert(
    input: {
      tenantId: string;
      workspaceId: string;
      assessmentId: string;
      config: AssessmentSecurityPolicyConfig;
    },
    transaction?: TransactionContext,
  ): Promise<AssessmentSecurityPolicyRecord>;
}

export abstract class ProctoringSessionRepository {
  abstract create(
    input: {
      tenantId: string;
      workspaceId: string;
      assessmentId: string;
      attemptId: string;
      learnerPrincipalId: string;
      mode: ProctoringMode;
      status: ProctoringSessionStatus;
      startedAt: Date;
      lastHeartbeatAt?: Date;
    },
    transaction?: TransactionContext,
  ): Promise<ProctoringSessionRecord>;

  abstract update(
    sessionId: string,
    input: Partial<{
      status: ProctoringSessionStatus;
      endedAt: Date | null;
      lastHeartbeatAt: Date | null;
    }>,
    transaction?: TransactionContext,
  ): Promise<ProctoringSessionRecord>;

  abstract findById(
    sessionId: string,
    transaction?: TransactionContext,
  ): Promise<ProctoringSessionRecord | null>;

  abstract findLatestByAttempt(
    attemptId: string,
    transaction?: TransactionContext,
  ): Promise<ProctoringSessionRecord | null>;

  abstract listActiveByAssessment(
    workspaceId: string,
    assessmentId: string,
    transaction?: TransactionContext,
  ): Promise<ProctoringSessionRecord[]>;
}

export abstract class ProctoringEventRepository {
  abstract create(
    input: {
      tenantId: string;
      workspaceId: string;
      sessionId: string;
      attemptId: string;
      assessmentId: string;
      learnerPrincipalId: string;
      eventId?: string | undefined;
      eventType: ProctoringEventType;
      severity: ProctoringEventSeverity;
      occurredAt: Date;
      metadata: Record<string, unknown>;
    },
    transaction?: TransactionContext,
  ): Promise<{ event: ProctoringEventRecord; duplicate: boolean }>;

  abstract countRecentBySession(
    sessionId: string,
    since: Date,
    transaction?: TransactionContext,
  ): Promise<number>;

  abstract listByAttempt(
    workspaceId: string,
    attemptId: string,
    transaction?: TransactionContext,
  ): Promise<ProctoringEventRecord[]>;

  abstract countBySessionAndSeverityAtLeast(
    sessionIds: string[],
    severity: ProctoringEventSeverity,
    transaction?: TransactionContext,
  ): Promise<Map<string, number>>;
}
