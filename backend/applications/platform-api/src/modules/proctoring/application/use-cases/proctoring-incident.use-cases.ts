import { Inject, Injectable } from '@nestjs/common';
import {
  AssessmentProctoringIncident,
  AssessmentProctoringEvent,
  AssessmentProctoringIncidentReviewAction,
  AssessmentProctoringIncidentSeverity,
  AssessmentProctoringIncidentType,
  AssessmentProctoringIncidentReviewActionType,
  AssessmentProctoringEventType,
  AssessmentProctoringIncidentStatus,
} from '@prisma/client';
import type {
  ProctoringIncidentContract,
  ProctoringIncidentDetailContract,
  ProctoringIncidentReviewActionContract,
  ProctoringIncidentSummaryContract,
  ProctoringIncidentListQueryContract,
  UpdateProctoringIncidentStatusRequestContract,
  AddProctoringIncidentNoteRequestContract,
  CreateManualProctoringIncidentRequestContract,
  ProctoringIncidentSeverityContract,
  ProctoringIncidentStatusContract,
  ProctoringIncidentReviewActionTypeContract,
  ProctoringIncidentTypeContract,
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
import { ProctoringPolicyService } from '../proctoring-policy.service.js';

function requireWorkspaceActor(context: RequestContext) {
  const workspace = context.workspace;
  if (!workspace?.tenantId || !workspace.workspaceId || !workspace.actorId) {
    throw new AppError('VALIDATION_ERROR', 'missing workspace actor context', 400);
  }
  return workspace;
}

function severityRank(severity: AssessmentProctoringIncidentSeverity): number {
  switch (severity) {
    case 'LOW':
      return 0;
    case 'MEDIUM':
      return 1;
    case 'HIGH':
      return 2;
    case 'CRITICAL':
      return 3;
  }
  return 0;
}

function getIncidentTitle(type: AssessmentProctoringIncidentType): string {
  switch (type) {
    case 'FOCUS_LOSS':
      return 'Focus Loss Detected';
    case 'FULLSCREEN_EXIT':
      return 'Fullscreen Exited';
    case 'COPY_PASTE_ACTIVITY':
      return 'Copy/Paste Activity';
    case 'CONNECTIVITY_INTERRUPTION':
      return 'Connectivity Lost';
    case 'SESSION_INTERRUPTION':
      return 'Session Interruption';
    case 'MULTIPLE_WARNINGS':
      return 'Multiple Warnings';
    case 'HIGH_SEVERITY_EVENT':
      return 'High Severity Event Flagged';
    case 'SYSTEM_FLAG':
      return 'System Warning Flagged';
    case 'MANUAL_REVIEW_FLAG':
      return 'Suspicious Activity Reported';
  }
}

function getIncidentSummary(type: AssessmentProctoringIncidentType): string {
  switch (type) {
    case 'FOCUS_LOSS':
      return 'Learner lost window/tab focus multiple times during the assessment.';
    case 'FULLSCREEN_EXIT':
      return 'Learner exited fullscreen mode during the assessment.';
    case 'COPY_PASTE_ACTIVITY':
      return 'Copy or paste actions were detected during the assessment.';
    case 'CONNECTIVITY_INTERRUPTION':
      return 'Learner device went offline.';
    case 'SESSION_INTERRUPTION':
      return 'Session was interrupted.';
    case 'MULTIPLE_WARNINGS':
      return 'Multiple warnings were triggered by the learner.';
    case 'HIGH_SEVERITY_EVENT':
      return 'A high-severity monitoring event was detected.';
    case 'SYSTEM_FLAG':
      return 'A system level warning was recorded.';
    case 'MANUAL_REVIEW_FLAG':
      return 'Suspicious activity was flagged by the system or Proctoring gateway.';
  }
}

function getEventTypesForIncidentType(
  type: AssessmentProctoringIncidentType,
): AssessmentProctoringEventType[] {
  switch (type) {
    case 'FOCUS_LOSS':
      return ['WINDOW_BLUR', 'VISIBILITY_HIDDEN'];
    case 'FULLSCREEN_EXIT':
      return ['FULLSCREEN_EXITED'];
    case 'COPY_PASTE_ACTIVITY':
      return ['COPY_ATTEMPTED', 'PASTE_ATTEMPTED'];
    case 'CONNECTIVITY_INTERRUPTION':
      return ['NETWORK_OFFLINE'];
    case 'MANUAL_REVIEW_FLAG':
      return ['SUSPICIOUS_ACTIVITY_REPORTED'];
    case 'SYSTEM_FLAG':
      return ['SYSTEM_WARNING'];
    default:
      return [];
  }
}

async function mapIncidentsToContracts(
  prisma: PrismaService,
  incidents: AssessmentProctoringIncident[],
  transaction?: TransactionContext,
): Promise<ProctoringIncidentContract[]> {
  const principalIds = new Set<string>();
  for (const incident of incidents) {
    if (incident.learnerPrincipalId) principalIds.add(incident.learnerPrincipalId);
    if (incident.reviewedByPrincipalId) principalIds.add(incident.reviewedByPrincipalId);
  }

  const client = getPrismaClient(prisma, transaction);
  const principals = await client.principal.findMany({
    where: { id: { in: Array.from(principalIds) } },
    select: { id: true, displayName: true },
  });

  const principalMap = new Map<string, string>();
  for (const p of principals) {
    principalMap.set(p.id, p.displayName ?? 'Unknown');
  }

  return incidents.map((incident) => ({
    id: incident.id,
    sessionId: incident.sessionId,
    attemptId: incident.attemptId,
    assessmentId: incident.assessmentId,
    learnerPrincipalId: incident.learnerPrincipalId,
    learnerDisplayName: principalMap.get(incident.learnerPrincipalId) ?? 'Unknown',
    incidentType: incident.incidentType as ProctoringIncidentTypeContract,
    severity: incident.severity as ProctoringIncidentSeverityContract,
    status: incident.status as ProctoringIncidentStatusContract,
    title: incident.title,
    summary: incident.summary,
    firstEventAt: incident.firstEventAt.toISOString(),
    lastEventAt: incident.lastEventAt.toISOString(),
    eventCount: incident.eventCount,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
    ...(incident.reviewedAt ? { reviewedAt: incident.reviewedAt.toISOString() } : {}),
    ...(incident.reviewedByPrincipalId
      ? { reviewedByPrincipalId: incident.reviewedByPrincipalId }
      : {}),
    reviewedByDisplayName: incident.reviewedByPrincipalId
      ? (principalMap.get(incident.reviewedByPrincipalId) ?? 'Unknown')
      : undefined,
    ...(incident.resolvedAt ? { resolvedAt: incident.resolvedAt.toISOString() } : {}),
    ...(incident.resolution ? { resolution: incident.resolution } : {}),
  }));
}

async function mapIncidentDetailToContract(
  prisma: PrismaService,
  incident: AssessmentProctoringIncident,
  events: AssessmentProctoringEvent[],
  reviewActions: AssessmentProctoringIncidentReviewAction[],
  policy: ProctoringPolicyService,
  transaction?: TransactionContext,
): Promise<ProctoringIncidentDetailContract> {
  const mappedIncidents = await mapIncidentsToContracts(prisma, [incident], transaction);
  const mappedIncident = mappedIncidents[0]!;

  const principalIds = new Set<string>();
  for (const action of reviewActions) {
    if (action.actorPrincipalId) principalIds.add(action.actorPrincipalId);
  }

  const client = getPrismaClient(prisma, transaction);
  const principals = await client.principal.findMany({
    where: { id: { in: Array.from(principalIds) } },
    select: { id: true, displayName: true },
  });

  const principalMap = new Map<string, string>();
  for (const p of principals) {
    principalMap.set(p.id, p.displayName ?? 'Unknown');
  }

  const mappedActions: ProctoringIncidentReviewActionContract[] = reviewActions.map((action) => ({
    id: action.id,
    incidentId: action.incidentId,
    actionType: action.actionType as ProctoringIncidentReviewActionTypeContract,
    actorPrincipalId: action.actorPrincipalId,
    actorDisplayName: principalMap.get(action.actorPrincipalId) ?? 'Unknown',
    note: action.note ?? undefined,
    createdAt: action.createdAt.toISOString(),
  }));

  const mappedEvents = events.map((event) =>
    policy.toEventContract({
      ...event,
      metadata:
        typeof event.metadata === 'object' &&
        event.metadata !== null &&
        !Array.isArray(event.metadata)
          ? (event.metadata as Record<string, unknown>)
          : {},
    }),
  );

  return {
    incident: mappedIncident,
    events: mappedEvents,
    reviewActions: mappedActions,
  };
}

export async function processIncidentPolicyForEvent(
  prisma: PrismaService,
  event: any,
  transaction?: TransactionContext,
): Promise<void> {
  const client = getPrismaClient(prisma, transaction);
  const severity = event.severity;
  const eventType = event.eventType;
  const occurredAt = event.occurredAt;
  const sessionId = event.sessionId;
  const workspaceId = event.workspaceId;
  const tenantId = event.tenantId;
  const attemptId = event.attemptId;
  const assessmentId = event.assessmentId;
  const learnerPrincipalId = event.learnerPrincipalId;

  let incidentType: AssessmentProctoringIncidentType;
  let defaultIncidentSeverity: AssessmentProctoringIncidentSeverity = 'LOW';

  switch (eventType) {
    case 'WINDOW_BLUR':
    case 'VISIBILITY_HIDDEN':
      incidentType = 'FOCUS_LOSS';
      defaultIncidentSeverity = 'LOW';
      break;
    case 'FULLSCREEN_EXITED':
      incidentType = 'FULLSCREEN_EXIT';
      defaultIncidentSeverity = 'HIGH';
      break;
    case 'COPY_ATTEMPTED':
    case 'PASTE_ATTEMPTED':
      incidentType = 'COPY_PASTE_ACTIVITY';
      defaultIncidentSeverity = 'MEDIUM';
      break;
    case 'NETWORK_OFFLINE':
      incidentType = 'CONNECTIVITY_INTERRUPTION';
      defaultIncidentSeverity = 'LOW';
      break;
    case 'SUSPICIOUS_ACTIVITY_REPORTED':
      incidentType = 'MANUAL_REVIEW_FLAG';
      defaultIncidentSeverity = 'HIGH';
      break;
    case 'SYSTEM_WARNING':
      incidentType = 'SYSTEM_FLAG';
      defaultIncidentSeverity = 'MEDIUM';
      break;
    default:
      if (severity === 'HIGH') {
        incidentType = 'HIGH_SEVERITY_EVENT';
        defaultIncidentSeverity = 'HIGH';
      } else {
        return;
      }
  }

  let finalSeverity: AssessmentProctoringIncidentSeverity = defaultIncidentSeverity;
  if (severity === 'HIGH') {
    finalSeverity = 'HIGH';
  }

  const isImmediate =
    severity === 'HIGH' ||
    incidentType === 'FULLSCREEN_EXIT' ||
    incidentType === 'MANUAL_REVIEW_FLAG';

  if (isImmediate) {
    const openIncident = await client.assessmentProctoringIncident.findFirst({
      where: {
        workspaceId,
        sessionId,
        incidentType,
        status: 'OPEN',
      },
    });

    if (openIncident) {
      await client.assessmentProctoringIncidentEvent.create({
        data: {
          tenantId,
          workspaceId,
          incidentId: openIncident.id,
          proctoringEventId: event.id,
        },
      });

      const eventCount = openIncident.eventCount + 1;
      const lastEventAt =
        occurredAt > openIncident.lastEventAt ? occurredAt : openIncident.lastEventAt;
      const firstEventAt =
        occurredAt < openIncident.firstEventAt ? occurredAt : openIncident.firstEventAt;

      let newSeverity = openIncident.severity;
      if (severityRank(finalSeverity) > severityRank(openIncident.severity)) {
        newSeverity = finalSeverity;
      }

      await client.assessmentProctoringIncident.update({
        where: { id: openIncident.id },
        data: {
          eventCount,
          lastEventAt,
          firstEventAt,
          severity: newSeverity,
        },
      });
    } else {
      const title = getIncidentTitle(incidentType);
      const summary = getIncidentSummary(incidentType);

      const newIncident = await client.assessmentProctoringIncident.create({
        data: {
          tenantId,
          workspaceId,
          sessionId,
          attemptId,
          assessmentId,
          learnerPrincipalId,
          incidentType,
          severity: finalSeverity,
          status: 'OPEN',
          title,
          summary,
          firstEventAt: occurredAt,
          lastEventAt: occurredAt,
          eventCount: 1,
        },
      });

      await client.assessmentProctoringIncidentEvent.create({
        data: {
          tenantId,
          workspaceId,
          incidentId: newIncident.id,
          proctoringEventId: event.id,
        },
      });

      await client.assessmentProctoringIncidentReviewAction.create({
        data: {
          tenantId,
          workspaceId,
          incidentId: newIncident.id,
          actionType: 'OPENED',
          actorPrincipalId: learnerPrincipalId,
          note: 'Incident auto-detected by system',
        },
      });
    }
  } else {
    const openIncident = await client.assessmentProctoringIncident.findFirst({
      where: {
        workspaceId,
        sessionId,
        incidentType,
        status: 'OPEN',
      },
    });

    if (openIncident) {
      await client.assessmentProctoringIncidentEvent.create({
        data: {
          tenantId,
          workspaceId,
          incidentId: openIncident.id,
          proctoringEventId: event.id,
        },
      });

      const eventCount = openIncident.eventCount + 1;
      const lastEventAt =
        occurredAt > openIncident.lastEventAt ? occurredAt : openIncident.lastEventAt;
      const firstEventAt =
        occurredAt < openIncident.firstEventAt ? occurredAt : openIncident.firstEventAt;

      let newSeverity = openIncident.severity;
      if (severityRank(finalSeverity) > severityRank(openIncident.severity)) {
        newSeverity = finalSeverity;
      }

      await client.assessmentProctoringIncident.update({
        where: { id: openIncident.id },
        data: {
          eventCount,
          lastEventAt,
          firstEventAt,
          severity: newSeverity,
        },
      });
    } else {
      const fiveMinutesAgo = new Date(occurredAt.getTime() - 5 * 60_000);

      const matchingEvents = await client.assessmentProctoringEvent.findMany({
        where: {
          sessionId,
          eventType: { in: getEventTypesForIncidentType(incidentType) },
          occurredAt: { gte: fiveMinutesAgo, lte: occurredAt },
          incidentEvents: { none: {} },
        },
        orderBy: { occurredAt: 'asc' },
      });

      if (matchingEvents.length >= 3) {
        const title = getIncidentTitle(incidentType);
        const summary = getIncidentSummary(incidentType);

        const earliestEvent = matchingEvents[0]!;
        const latestEvent = matchingEvents[matchingEvents.length - 1]!;

        let newSeverity: AssessmentProctoringIncidentSeverity = 'LOW';
        for (const ev of matchingEvents) {
          const evSev: AssessmentProctoringIncidentSeverity =
            ev.severity === 'HIGH' ? 'HIGH' : ev.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW';
          if (severityRank(evSev) > severityRank(newSeverity)) {
            newSeverity = evSev;
          }
        }

        const newIncident = await client.assessmentProctoringIncident.create({
          data: {
            tenantId,
            workspaceId,
            sessionId,
            attemptId,
            assessmentId,
            learnerPrincipalId,
            incidentType,
            severity: newSeverity,
            status: 'OPEN',
            title,
            summary,
            firstEventAt: earliestEvent.occurredAt,
            lastEventAt: latestEvent.occurredAt,
            eventCount: matchingEvents.length,
          },
        });

        await client.assessmentProctoringIncidentEvent.createMany({
          data: matchingEvents.map((ev) => ({
            tenantId,
            workspaceId,
            incidentId: newIncident.id,
            proctoringEventId: ev.id,
          })),
        });

        await client.assessmentProctoringIncidentReviewAction.create({
          data: {
            tenantId,
            workspaceId,
            incidentId: newIncident.id,
            actionType: 'OPENED',
            actorPrincipalId: learnerPrincipalId,
            note: `Incident auto-detected (warning threshold of ${matchingEvents.length} events exceeded)`,
          },
        });
      }
    }
  }
}

@Injectable()
export class GetProctoringIncidentUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProctoringPolicyService) private readonly policy: ProctoringPolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    incidentId: string,
    transaction?: TransactionContext,
  ): Promise<ProctoringIncidentDetailContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_MONITOR, workspace },
      context,
    );
    const fallbackPermission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_UPDATE, workspace },
      context,
    );

    if (!permission.allowed && !fallbackPermission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const client = getPrismaClient(this.prisma, transaction);
    const incident = await client.assessmentProctoringIncident.findUnique({
      where: { id: incidentId },
      include: {
        events: {
          include: {
            proctoringEvent: true,
          },
        },
        reviewActions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!incident || incident.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'incident not found', 404);
    }

    const events = incident.events.map((e) => e.proctoringEvent);

    return mapIncidentDetailToContract(
      this.prisma,
      incident,
      events,
      incident.reviewActions,
      this.policy,
      transaction,
    );
  }
}

@Injectable()
export class ListProctoringIncidentsUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    query: ProctoringIncidentListQueryContract,
  ): Promise<ProctoringIncidentContract[]> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_MONITOR, workspace },
      context,
    );
    const fallbackPermission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_UPDATE, workspace },
      context,
    );

    if (!permission.allowed && !fallbackPermission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const client = getPrismaClient(this.prisma);
    const incidents = await client.assessmentProctoringIncident.findMany({
      where: {
        workspaceId: workspace.workspaceId,
        ...(query.assessmentId ? { assessmentId: query.assessmentId } : {}),
        ...(query.attemptId ? { attemptId: query.attemptId } : {}),
        ...(query.status ? { status: query.status as AssessmentProctoringIncidentStatus } : {}),
        ...(query.severity
          ? { severity: query.severity as AssessmentProctoringIncidentSeverity }
          : {}),
      },
      orderBy: { lastEventAt: 'desc' },
    });

    return mapIncidentsToContracts(this.prisma, incidents);
  }
}

@Injectable()
export class GetProctoringIncidentSummaryUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext): Promise<ProctoringIncidentSummaryContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_MONITOR, workspace },
      context,
    );
    const fallbackPermission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_UPDATE, workspace },
      context,
    );

    if (!permission.allowed && !fallbackPermission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const client = getPrismaClient(this.prisma);
    const workspaceId = workspace.workspaceId;

    const openCount = await client.assessmentProctoringIncident.count({
      where: { workspaceId, status: 'OPEN' },
    });

    const highSeverityCount = await client.assessmentProctoringIncident.count({
      where: {
        workspaceId,
        severity: { in: ['HIGH', 'CRITICAL'] },
        status: { in: ['OPEN', 'IN_REVIEW', 'ESCALATED'] },
      },
    });

    const inReviewCount = await client.assessmentProctoringIncident.count({
      where: { workspaceId, status: 'IN_REVIEW' },
    });

    const resolvedDismissedCount = await client.assessmentProctoringIncident.count({
      where: {
        workspaceId,
        status: { in: ['RESOLVED', 'DISMISSED'] },
      },
    });

    const attempts = await client.assessmentProctoringIncident.groupBy({
      by: ['attemptId'],
      where: { workspaceId },
    });

    return {
      openCount,
      highSeverityCount,
      inReviewCount,
      resolvedDismissedCount,
      attemptsWithIncidentsCount: attempts.length,
    };
  }
}

@Injectable()
export class UpdateProctoringIncidentStatusUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GetProctoringIncidentUseCase)
    private readonly getIncident: GetProctoringIncidentUseCase,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(
    context: RequestContext,
    incidentId: string,
    input: UpdateProctoringIncidentStatusRequestContract,
  ): Promise<ProctoringIncidentDetailContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_MONITOR, workspace },
      context,
    );
    const fallbackPermission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_UPDATE, workspace },
      context,
    );

    if (!permission.allowed && !fallbackPermission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    if (input.note && (typeof input.note !== 'string' || input.note.length > 2000)) {
      throw new AppError('VALIDATION_ERROR', 'note text must not exceed 2000 characters', 400);
    }

    const client = getPrismaClient(this.prisma);
    const incident = await client.assessmentProctoringIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident || incident.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'incident not found', 404);
    }

    const currentStatus = incident.status;
    const targetStatus = input.status;

    if (currentStatus === targetStatus) {
      throw new AppError('VALIDATION_ERROR', `Incident is already in status ${targetStatus}`, 400);
    }

    // Check valid transitions
    let isValid = false;
    if (currentStatus === 'OPEN') {
      isValid = ['IN_REVIEW', 'RESOLVED', 'DISMISSED', 'ESCALATED'].includes(targetStatus);
    } else if (currentStatus === 'IN_REVIEW') {
      isValid = ['RESOLVED', 'DISMISSED', 'ESCALATED'].includes(targetStatus);
    } else if (currentStatus === 'ESCALATED') {
      isValid = ['IN_REVIEW', 'RESOLVED', 'DISMISSED'].includes(targetStatus);
    } else if (currentStatus === 'RESOLVED' || currentStatus === 'DISMISSED') {
      isValid = ['OPEN', 'IN_REVIEW'].includes(targetStatus);
    }

    if (!isValid) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Invalid status transition from ${currentStatus} to ${targetStatus}`,
        400,
      );
    }

    let actionType: AssessmentProctoringIncidentReviewActionType;
    switch (targetStatus) {
      case 'OPEN':
        actionType = 'REOPENED';
        break;
      case 'IN_REVIEW':
        actionType = 'MARKED_IN_REVIEW';
        break;
      case 'RESOLVED':
        actionType = 'RESOLVED';
        break;
      case 'DISMISSED':
        actionType = 'DISMISSED';
        break;
      case 'ESCALATED':
        actionType = 'ESCALATED';
        break;
      default:
        throw new AppError('VALIDATION_ERROR', 'invalid status value', 400);
    }

    const isTerminal = targetStatus === 'RESOLVED' || targetStatus === 'DISMISSED';
    const now = new Date();

    return this.transactionRunner.run(async (tx) => {
      const txClient = getPrismaClient(this.prisma, tx);
      await txClient.assessmentProctoringIncident.update({
        where: { id: incidentId },
        data: {
          status: targetStatus as AssessmentProctoringIncidentStatus,
          reviewedAt: now,
          reviewedByPrincipalId: workspace.actorId!,
          ...(isTerminal
            ? { resolvedAt: now, resolution: input.note ?? `Status changed to ${targetStatus}` }
            : { resolvedAt: null, resolution: null }),
        },
      });

      await txClient.assessmentProctoringIncidentReviewAction.create({
        data: {
          tenantId: workspace.tenantId!,
          workspaceId: workspace.workspaceId!,
          incidentId,
          actionType,
          actorPrincipalId: workspace.actorId!,
          note: input.note ?? null,
        },
      });

      return this.getIncident.execute(context, incidentId, tx);
    });
  }
}

@Injectable()
export class AddProctoringIncidentNoteUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GetProctoringIncidentUseCase)
    private readonly getIncident: GetProctoringIncidentUseCase,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(
    context: RequestContext,
    incidentId: string,
    input: AddProctoringIncidentNoteRequestContract,
  ): Promise<ProctoringIncidentDetailContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_MONITOR, workspace },
      context,
    );
    const fallbackPermission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_UPDATE, workspace },
      context,
    );

    if (!permission.allowed && !fallbackPermission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    if (!input.note || typeof input.note !== 'string' || input.note.trim().length === 0) {
      throw new AppError('VALIDATION_ERROR', 'note text is required', 400);
    }

    if (input.note.length > 2000) {
      throw new AppError('VALIDATION_ERROR', 'note text must not exceed 2000 characters', 400);
    }

    const client = getPrismaClient(this.prisma);
    const incident = await client.assessmentProctoringIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident || incident.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'incident not found', 404);
    }

    return this.transactionRunner.run(async (tx) => {
      const txClient = getPrismaClient(this.prisma, tx);
      await txClient.assessmentProctoringIncidentReviewAction.create({
        data: {
          tenantId: workspace.tenantId!,
          workspaceId: workspace.workspaceId!,
          incidentId,
          actionType: 'NOTE_ADDED',
          actorPrincipalId: workspace.actorId!,
          note: input.note,
        },
      });

      await txClient.assessmentProctoringIncident.update({
        where: { id: incidentId },
        data: {
          updatedAt: new Date(),
        },
      });

      return this.getIncident.execute(context, incidentId, tx);
    });
  }
}

@Injectable()
export class CreateManualProctoringIncidentUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GetProctoringIncidentUseCase)
    private readonly getIncident: GetProctoringIncidentUseCase,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(
    context: RequestContext,
    input: CreateManualProctoringIncidentRequestContract,
  ): Promise<ProctoringIncidentDetailContract> {
    const workspace = requireWorkspaceActor(context);
    const permission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_MONITOR, workspace },
      context,
    );
    const fallbackPermission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_UPDATE, workspace },
      context,
    );

    if (!permission.allowed && !fallbackPermission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    if (input.note && (typeof input.note !== 'string' || input.note.length > 2000)) {
      throw new AppError('VALIDATION_ERROR', 'note text must not exceed 2000 characters', 400);
    }

    const client = getPrismaClient(this.prisma);

    const session = await client.assessmentProctoringSession.findUnique({
      where: { id: input.sessionId },
    });

    if (!session || session.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'proctoring session not found', 404);
    }

    if (session.attemptId !== input.attemptId) {
      throw new AppError(
        'VALIDATION_ERROR',
        'attemptId does not match the proctoring session',
        400,
      );
    }
    if (session.assessmentId !== input.assessmentId) {
      throw new AppError(
        'VALIDATION_ERROR',
        'assessmentId does not match the proctoring session',
        400,
      );
    }
    if (session.learnerPrincipalId !== input.learnerPrincipalId) {
      throw new AppError(
        'VALIDATION_ERROR',
        'learnerPrincipalId does not match the proctoring session',
        400,
      );
    }

    const now = new Date();

    return this.transactionRunner.run(async (tx) => {
      const txClient = getPrismaClient(this.prisma, tx);
      const created = await txClient.assessmentProctoringIncident.create({
        data: {
          tenantId: workspace.tenantId!,
          workspaceId: workspace.workspaceId!,
          sessionId: input.sessionId,
          attemptId: input.attemptId,
          assessmentId: input.assessmentId,
          learnerPrincipalId: input.learnerPrincipalId,
          incidentType: input.incidentType as AssessmentProctoringIncidentType,
          severity: input.severity as AssessmentProctoringIncidentSeverity,
          status: 'OPEN',
          title: input.title,
          summary: input.summary,
          firstEventAt: now,
          lastEventAt: now,
          eventCount: 0,
        },
      });

      await txClient.assessmentProctoringIncidentReviewAction.create({
        data: {
          tenantId: workspace.tenantId!,
          workspaceId: workspace.workspaceId!,
          incidentId: created.id,
          actionType: 'OPENED',
          actorPrincipalId: workspace.actorId!,
          note: input.note ?? 'Manual incident opened by teacher',
        },
      });

      return this.getIncident.execute(context, created.id, tx);
    });
  }
}
