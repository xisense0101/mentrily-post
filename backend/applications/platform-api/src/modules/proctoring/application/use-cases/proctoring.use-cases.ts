import { Inject, Injectable } from '@nestjs/common';
import type {
  ProctoringAttemptMonitoringSummaryContract,
  ProctoringAttemptMonitoringTimelineContract,
  ProctoringAttemptSummaryContract,
  ProctoringHeartbeatRequestContract,
  ProctoringSessionContract,
  RecordProctoringEventRequestContract,
  RecordProctoringEventResponseContract,
  StartProctoringSessionResponseContract,
} from '@mentrily/contract-catalog';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
  TransactionContext,
  TRANSACTION_RUNNER,
  TransactionRunner,
} from '@mentrily/service-core';
import { PrismaService, getPrismaClient } from '@mentrily/data-platform';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import {
  ProctoringEventRepository,
  ProctoringSessionRepository,
} from '../proctoring.repository.js';
import type { ProctoringSessionRecord } from '../proctoring.types.js';
import { ProctoringPolicyService } from '../proctoring-policy.service.js';
import { ProctoringReadService } from '../proctoring-read.service.js';

function requireWorkspaceActor(context: RequestContext) {
  const workspace = context.workspace;
  if (!workspace?.tenantId || !workspace.workspaceId || !workspace.actorId) {
    throw new AppError('VALIDATION_ERROR', 'missing workspace actor context', 400);
  }
  return workspace;
}

async function loadAttemptForWorkspace(
  prisma: PrismaService,
  attemptId: string,
  workspaceId: string,
) {
  const attempt = await getPrismaClient(prisma).assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      tenantId: true,
      workspaceId: true,
      assessmentId: true,
      learnerPrincipalId: true,
      status: true,
      metadata: true,
    },
  });
  if (!attempt || attempt.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 'attempt not found', 404);
  }
  return attempt;
}

@Injectable()
export class StartProctoringSessionUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProctoringSessionRepository)
    private readonly sessions: ProctoringSessionRepository,
    @Inject(ProctoringPolicyService)
    private readonly policy: ProctoringPolicyService,
    @Inject(ProctoringReadService)
    private readonly reader: ProctoringReadService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(
    context: RequestContext,
    attemptId: string,
  ): Promise<StartProctoringSessionResponseContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_ATTEMPT_READ, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const attempt = await loadAttemptForWorkspace(this.prisma, attemptId, workspace.workspaceId);
    if (attempt.learnerPrincipalId !== workspace.actorId) {
      throw new AppError('FORBIDDEN', 'you do not own this attempt', 403);
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new AppError('CONFLICT', 'attempt is not active', 409);
    }

    const mode = this.policy.getModeFromAssessmentMetadata(
      (attempt.metadata as Record<string, unknown> | null | undefined) ?? undefined,
    );

    if (mode === 'OFF') {
      return { summary: this.policy.toAttemptSummary(mode, null) };
    }

    const session = await this.transactionRunner.run<ProctoringSessionRecord>(async (tx) => {
      const client = getPrismaClient(this.prisma, tx);
      await client.$executeRawUnsafe(
        'SELECT id FROM "AssessmentAttempt" WHERE id = $1::uuid FOR UPDATE',
        attemptId,
      );

      const existing = await this.sessions.findLatestByAttempt(attemptId, tx);
      if (existing && (existing.status === 'ACTIVE' || existing.status === 'PENDING')) {
        return existing;
      }

      const now = new Date();
      return await this.sessions.create(
        {
          tenantId: attempt.tenantId,
          workspaceId: attempt.workspaceId,
          assessmentId: attempt.assessmentId,
          attemptId: attempt.id,
          learnerPrincipalId: attempt.learnerPrincipalId,
          mode,
          status: 'ACTIVE',
          startedAt: now,
          lastHeartbeatAt: now,
        },
        tx,
      );
    });

    return { summary: this.policy.toAttemptSummary(mode, session) };
  }
}

@Injectable()
export class RecordProctoringHeartbeatUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProctoringSessionRepository)
    private readonly sessions: ProctoringSessionRepository,
    @Inject(ProctoringEventRepository)
    private readonly events: ProctoringEventRepository,
    @Inject(ProctoringPolicyService)
    private readonly policy: ProctoringPolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    sessionId: string,
    input: ProctoringHeartbeatRequestContract,
  ): Promise<ProctoringSessionContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_ATTEMPT_READ, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const session = await this.sessions.findById(sessionId);
    if (!session || session.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'proctoring session not found', 404);
    }
    if (session.learnerPrincipalId !== workspace.actorId) {
      throw new AppError('FORBIDDEN', 'you do not own this monitoring session', 403);
    }
    if (session.status !== 'ACTIVE' && session.status !== 'PENDING') {
      throw new AppError('CONFLICT', 'monitoring session is not active', 409);
    }

    const recentCount = await this.events.countRecentBySession(
      sessionId,
      new Date(Date.now() - 60_000),
    );
    if (recentCount >= this.policy.maxEventsPerMinute) {
      throw new AppError('RATE_LIMITED', 'too many monitoring events', 429);
    }

    const now = new Date();
    await this.events.create({
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      sessionId: session.id,
      attemptId: session.attemptId,
      assessmentId: session.assessmentId,
      learnerPrincipalId: session.learnerPrincipalId,
      eventType: 'HEARTBEAT',
      severity: 'INFO',
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : now,
      metadata: this.policy.sanitizeMetadata('HEARTBEAT', {
        clientTime: input.clientTime,
        sequence: input.sequence,
      }),
    });
    const updated = await this.sessions.update(sessionId, {
      status: 'ACTIVE',
      lastHeartbeatAt: now,
    });
    return this.policy.toSessionContract(updated);
  }
}

@Injectable()
export class RecordProctoringEventUseCase {
  constructor(
    @Inject(ProctoringSessionRepository)
    private readonly sessions: ProctoringSessionRepository,
    @Inject(ProctoringEventRepository)
    private readonly events: ProctoringEventRepository,
    @Inject(ProctoringPolicyService)
    private readonly policy: ProctoringPolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    sessionId: string,
    input: RecordProctoringEventRequestContract,
  ): Promise<RecordProctoringEventResponseContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_ATTEMPT_READ, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const session = await this.sessions.findById(sessionId);
    if (!session || session.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'proctoring session not found', 404);
    }
    if (session.learnerPrincipalId !== workspace.actorId) {
      throw new AppError('FORBIDDEN', 'you do not own this monitoring session', 403);
    }
    if (session.status !== 'ACTIVE' && session.status !== 'PENDING') {
      throw new AppError('CONFLICT', 'monitoring session is not active', 409);
    }
    if (!this.policy.isEventTypeAllowed(input.eventType)) {
      throw new AppError('VALIDATION_ERROR', 'unsupported proctoring event type', 400);
    }
    const severity = input.severity ?? 'INFO';
    if (!this.policy.isSeverityAllowed(severity)) {
      throw new AppError('VALIDATION_ERROR', 'unsupported proctoring event severity', 400);
    }
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    if (
      Number.isNaN(occurredAt.getTime()) ||
      Math.abs(Date.now() - occurredAt.getTime()) > 24 * 60 * 60_000
    ) {
      throw new AppError('VALIDATION_ERROR', 'invalid proctoring event timestamp', 400);
    }

    const recentCount = await this.events.countRecentBySession(
      sessionId,
      new Date(Date.now() - 60_000),
    );
    if (recentCount >= this.policy.maxEventsPerMinute) {
      throw new AppError('RATE_LIMITED', 'too many monitoring events', 429);
    }

    const result = await this.events.create({
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      sessionId: session.id,
      attemptId: session.attemptId,
      assessmentId: session.assessmentId,
      learnerPrincipalId: session.learnerPrincipalId,
      ...(input.eventId ? { eventId: input.eventId } : {}),
      eventType: input.eventType,
      severity,
      occurredAt,
      metadata: this.policy.sanitizeMetadata(input.eventType, input.metadata),
    });

    return {
      event: this.policy.toEventContract(result.event),
      duplicate: result.duplicate,
    };
  }
}

@Injectable()
export class EndProctoringSessionUseCase {
  constructor(
    @Inject(ProctoringSessionRepository)
    private readonly sessions: ProctoringSessionRepository,
    @Inject(ProctoringEventRepository)
    private readonly events: ProctoringEventRepository,
    @Inject(ProctoringPolicyService)
    private readonly policy: ProctoringPolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext, sessionId: string): Promise<ProctoringSessionContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_ATTEMPT_READ, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const session = await this.sessions.findById(sessionId);
    if (!session || session.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'proctoring session not found', 404);
    }
    if (session.learnerPrincipalId !== workspace.actorId) {
      throw new AppError('FORBIDDEN', 'you do not own this monitoring session', 403);
    }
    if (
      session.status === 'ENDED' ||
      session.status === 'EXPIRED' ||
      session.status === 'CANCELLED'
    ) {
      return this.policy.toSessionContract(session);
    }

    const now = new Date();
    await this.events.create({
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      sessionId: session.id,
      attemptId: session.attemptId,
      assessmentId: session.assessmentId,
      learnerPrincipalId: session.learnerPrincipalId,
      eventType: 'SESSION_ENDED',
      severity: 'INFO',
      occurredAt: now,
      metadata: {},
    });
    const updated = await this.sessions.update(sessionId, {
      status: 'ENDED',
      endedAt: now,
      lastHeartbeatAt: now,
    });
    return this.policy.toSessionContract(updated);
  }
}

@Injectable()
export class GetAttemptMonitoringTimelineUseCase {
  constructor(
    @Inject(ProctoringReadService)
    private readonly reader: ProctoringReadService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    attemptId: string,
  ): Promise<ProctoringAttemptMonitoringTimelineContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_MONITOR, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }
    return this.reader.getAttemptTimeline(attemptId, workspace.workspaceId);
  }
}

@Injectable()
export class GetActiveAttemptMonitoringUseCase {
  constructor(
    @Inject(ProctoringReadService)
    private readonly reader: ProctoringReadService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    assessmentId: string,
  ): Promise<ProctoringAttemptMonitoringSummaryContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_MONITOR, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }
    return this.reader.getActiveAssessmentSummary(assessmentId, workspace.workspaceId);
  }
}

@Injectable()
export class GetProctoringSessionUseCase {
  constructor(
    @Inject(ProctoringSessionRepository)
    private readonly sessions: ProctoringSessionRepository,
    @Inject(ProctoringPolicyService)
    private readonly policy: ProctoringPolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext, sessionId: string): Promise<ProctoringSessionContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_MONITOR, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }
    const session = await this.sessions.findById(sessionId);
    if (!session || session.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'proctoring session not found', 404);
    }
    return this.policy.toSessionContract(session);
  }
}

@Injectable()
export class GetLearnerAttemptProctoringUseCase {
  constructor(@Inject(ProctoringReadService) private readonly reader: ProctoringReadService) {}

  async execute(
    context: RequestContext,
    attemptId: string,
    transaction?: TransactionContext,
  ): Promise<ProctoringAttemptSummaryContract> {
    const workspace = requireWorkspaceActor(context);
    return this.reader.getAttemptSummary(attemptId, workspace.workspaceId, transaction);
  }
}

@Injectable()
export class SyncAttemptTerminalProctoringUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProctoringSessionRepository)
    private readonly sessions: ProctoringSessionRepository,
  ) {}

  async execute(
    attemptId: string,
    terminalStatus: 'ENDED' | 'EXPIRED' | 'CANCELLED',
    transaction?: TransactionContext,
  ): Promise<void> {
    const attempt = await getPrismaClient(this.prisma, transaction).assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true },
    });
    if (!attempt) {
      return;
    }

    const latest = await this.sessions.findLatestByAttempt(attemptId, transaction);
    if (
      !latest ||
      latest.status === 'ENDED' ||
      latest.status === 'EXPIRED' ||
      latest.status === 'CANCELLED'
    ) {
      return;
    }

    await this.sessions.update(
      latest.id,
      {
        status: terminalStatus,
        endedAt: new Date(),
      },
      transaction,
    );
  }
}
