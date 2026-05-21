/**
 * StartAssessmentAttemptUseCase
 * Starts a new learner attempt from the latest published snapshot.
 */

import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  AUDIT_RECORDER,
  AuditRecorder,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
  TRANSACTION_RUNNER,
  TransactionRunner,
} from '@mentrily/service-core';
import { DataError, DataErrorType } from '@mentrily/data-platform';
import { PrismaService, getPrismaClient } from '@mentrily/data-platform';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AssessmentAttempt } from '../../domain/entities/index.js';
import {
  AssessmentRepository,
  AssessmentSnapshotRepository,
  AssessmentAttemptRepository,
} from '../../domain/repositories/index.js';
import { AssessmentAttemptPolicyService } from '../../domain/services/index.js';
import { createAssessmentAttemptStartedEvent } from '../../domain/events/index.js';
import { AssessmentEventPublisherService } from '../services/index.js';
import { mapAttemptToResponse } from '../mappers/index.js';
import { AssessmentAttemptResponse, StartAssessmentAttemptInput } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class StartAssessmentAttemptUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AssessmentRepository) private readonly assessmentRepo: AssessmentRepository,
    @Inject(AssessmentSnapshotRepository)
    private readonly snapshotRepo: AssessmentSnapshotRepository,
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(AssessmentAttemptPolicyService)
    private readonly attemptPolicy: AssessmentAttemptPolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(AssessmentEventPublisherService)
    private readonly eventPublisher: AssessmentEventPublisherService,
  ) {}

  async execute(
    context: RequestContext,
    assessmentId: string,
    input?: StartAssessmentAttemptInput,
  ): Promise<AssessmentAttemptResponse> {
    const workspace = requireAssessmentActor(context);
    if (input?.assessmentId && input.assessmentId !== assessmentId) {
      throw new AppError('VALIDATION_ERROR', 'assessmentId body must match route parameter', 400);
    }

    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_ATTEMPT_START, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const now = new Date();
      const client = getPrismaClient(this.prisma, tx);
      const lockKey = `${workspace.tenantId}:${workspace.workspaceId}:${workspace.actorId}:${assessmentId}:attempt-start`;
      await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;

      // Load assessment
      const assessment = await this.assessmentRepo.findById(assessmentId, tx);
      if (
        !assessment ||
        assessment.workspaceId !== workspace.workspaceId ||
        assessment.tenantId !== workspace.tenantId
      ) {
        throw new AppError('NOT_FOUND', 'assessment not found', 404);
      }

      // Load latest snapshot
      const snapshot = await this.snapshotRepo.findLatestByAssessmentId(assessmentId, tx);

      const existingAttempts = await this.attemptRepo.listByAssessmentAndLearner(
        {
          assessmentId,
          learnerPrincipalId: workspace.actorId,
        },
        tx,
      );

      // Normalize stale active attempts before retrying a start.
      for (const existingAttempt of existingAttempts) {
        if (existingAttempt.isInProgress() && existingAttempt.isSessionExpired(now)) {
          existingAttempt.expire();
          await this.attemptRepo.save(existingAttempt, tx);
        }
      }

      const activeAttempt = await this.attemptRepo.findInProgressByAssessmentAndLearner(
        {
          assessmentId,
          learnerPrincipalId: workspace.actorId,
        },
        tx,
      );
      if (activeAttempt) {
        return mapAttemptToResponse(activeAttempt);
      }

      const policyResult = this.attemptPolicy.canStartAttempt({
        assessmentStatus: assessment.status,
        snapshotId: snapshot?.id,
        existingAttempts: existingAttempts.map((attempt) => {
          if (attempt.isInProgress() && attempt.isSessionExpired(now)) {
            attempt.expire();
          }
          return attempt;
        }),
        ...(assessment.attemptPolicy.maxAttempts !== undefined
          ? { maxAttempts: assessment.attemptPolicy.maxAttempts }
          : {}),
        allowRetake: assessment.attemptPolicy.allowRetake,
      });
      if (!policyResult.allowed) {
        throw new AppError('VALIDATION_ERROR', policyResult.reason ?? 'Cannot start attempt', 400);
      }

      if (!snapshot) {
        throw new AppError('NOT_FOUND', 'no published snapshot found', 404);
      }

      // Calculate expiry
      const startedAt = now;
      const timeLimitMinutes = assessment.timeLimit.isTimed()
        ? (assessment.timeLimit.minutes() ?? undefined)
        : undefined;
      const expiresAt = this.attemptPolicy.calculateExpiresAt({
        startedAt,
        ...(timeLimitMinutes !== undefined ? { timeLimitMinutes } : {}),
      });

      const attemptId = randomUUID();
      const sessionId = randomUUID();

      const attempt = AssessmentAttempt.start({
        id: attemptId,
        tenantId: workspace.tenantId,
        workspaceId: workspace.workspaceId,
        assessmentId,
        snapshotId: snapshot.id,
        snapshotVersionId: snapshot.versionId,
        snapshotVersionNumber: snapshot.versionNumber,
        learnerPrincipalId: workspace.actorId,
        sessionId,
        startedAt,
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(input?.metadata !== undefined ? { metadata: input.metadata } : {}),
      });

      let saved: AssessmentAttempt;
      try {
        saved = await this.attemptRepo.save(attempt, tx);
      } catch (error) {
        if (error instanceof DataError && error.type === DataErrorType.UNIQUE_VIOLATION) {
          const concurrentAttempt = await this.attemptRepo.findInProgressByAssessmentAndLearner(
            {
              assessmentId,
              learnerPrincipalId: workspace.actorId,
            },
            tx,
          );
          if (concurrentAttempt) {
            return mapAttemptToResponse(concurrentAttempt);
          }
        }
        throw error;
      }

      await this.auditRecorder.record(
        {
          action: 'assessment.attempt.started',
          actorId: workspace.actorId,
          targetType: 'assessment-attempt',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        createAssessmentAttemptStartedEvent(saved.id, saved.tenantId, saved.workspaceId, {
          assessmentId: saved.assessmentId,
          snapshotId: saved.snapshotId,
          learnerPrincipalId: saved.learnerPrincipalId,
          ...(saved.expiresAt !== undefined ? { expiresAt: saved.expiresAt.toISOString() } : {}),
        }),
        context,
        tx,
      );

      return mapAttemptToResponse(saved);
    });
  }
}
