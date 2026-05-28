import { Inject, Injectable } from '@nestjs/common';
import type {
  ProctoringAttemptMonitoringSummaryContract,
  ProctoringAttemptMonitoringTimelineContract,
  ProctoringAttemptSummaryContract,
} from '@mentrily/contract-catalog';
import { AppError, TransactionContext } from '@mentrily/service-core';
import { PrismaService, getPrismaClient } from '@mentrily/data-platform';
import {
  AssessmentSecurityPolicyRepository,
  ProctoringEventRepository,
  ProctoringSessionRepository,
} from './proctoring.repository.js';
import { ProctoringPolicyService } from './proctoring-policy.service.js';

@Injectable()
export class ProctoringReadService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProctoringSessionRepository)
    private readonly sessionRepository: ProctoringSessionRepository,
    @Inject(ProctoringEventRepository)
    private readonly eventRepository: ProctoringEventRepository,
    @Inject(AssessmentSecurityPolicyRepository)
    private readonly policyRepository: AssessmentSecurityPolicyRepository,
    @Inject(ProctoringPolicyService)
    private readonly policy: ProctoringPolicyService,
  ) {}

  async getAttemptSummary(
    attemptId: string,
    workspaceId: string,
    transaction?: TransactionContext,
  ): Promise<ProctoringAttemptSummaryContract> {
    const attempt = await getPrismaClient(this.prisma, transaction).assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        workspaceId: true,
        assessmentId: true,
      },
    });
    if (!attempt || attempt.workspaceId !== workspaceId) {
      throw new AppError('NOT_FOUND', 'attempt not found', 404);
    }
    const configuredPolicy = await this.getPolicy(attempt.assessmentId, workspaceId, transaction);
    const session = await this.sessionRepository.findLatestByAttempt(attemptId, transaction);
    return this.policy.toAttemptSummary(configuredPolicy, session);
  }

  async getAttemptTimeline(
    attemptId: string,
    workspaceId: string,
    transaction?: TransactionContext,
  ): Promise<ProctoringAttemptMonitoringTimelineContract> {
    const attempt = await getPrismaClient(this.prisma, transaction).assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        workspaceId: true,
        assessmentId: true,
      },
    });
    if (!attempt || attempt.workspaceId !== workspaceId) {
      throw new AppError('NOT_FOUND', 'attempt not found', 404);
    }
    const configuredPolicy = await this.getPolicy(attempt.assessmentId, workspaceId, transaction);
    const session = await this.sessionRepository.findLatestByAttempt(attemptId, transaction);
    const events = await this.eventRepository.listByAttempt(workspaceId, attemptId, transaction);

    return {
      attemptId,
      assessmentId: attempt.assessmentId,
      disclosure: this.policy.buildDisclosure(configuredPolicy),
      ...(session ? { session: this.policy.toSessionContract(session) } : {}),
      events: events.map((event) => this.policy.toEventContract(event)),
    };
  }

  async getActiveAssessmentSummary(
    assessmentId: string,
    workspaceId: string,
    transaction?: TransactionContext,
  ): Promise<ProctoringAttemptMonitoringSummaryContract> {
    const sessions = await this.sessionRepository.listActiveByAssessment(
      workspaceId,
      assessmentId,
      transaction,
    );
    const highSeverity = await this.eventRepository.countBySessionAndSeverityAtLeast(
      sessions.map((session) => session.id),
      'HIGH',
      transaction,
    );
    const warningSeverity = await this.eventRepository.countBySessionAndSeverityAtLeast(
      sessions.map((session) => session.id),
      'MEDIUM',
      transaction,
    );

    return {
      assessmentId,
      activeCount: sessions.length,
      sessions: sessions.map((session) => ({
        sessionId: session.id,
        attemptId: session.attemptId,
        learnerPrincipalId: session.learnerPrincipalId,
        status: session.status,
        mode: session.mode,
        ...(session.lastHeartbeatAt
          ? { lastHeartbeatAt: session.lastHeartbeatAt.toISOString() }
          : {}),
        highSeverityEvents: highSeverity.get(session.id) ?? 0,
        warningEvents: warningSeverity.get(session.id) ?? 0,
      })),
    };
  }

  private async getPolicy(
    assessmentId: string,
    workspaceId: string,
    transaction?: TransactionContext,
  ) {
    const policyRecord = await this.policyRepository.findByAssessmentId(
      workspaceId,
      assessmentId,
      transaction,
    );
    if (policyRecord) {
      return this.policy.fromRecord(policyRecord);
    }

    const assessment = await getPrismaClient(this.prisma, transaction).assessment.findUnique({
      where: { id: assessmentId },
      select: { workspaceId: true, metadata: true },
    });
    if (!assessment || assessment.workspaceId !== workspaceId) {
      return this.policy.createDefaultPolicy(assessmentId);
    }

    return {
      ...this.policy.createDefaultPolicy(assessmentId),
      proctoringMode: this.policy.getModeFromAssessmentMetadata(
        (assessment.metadata as Record<string, unknown> | null | undefined) ?? undefined,
      ),
    };
  }
}
