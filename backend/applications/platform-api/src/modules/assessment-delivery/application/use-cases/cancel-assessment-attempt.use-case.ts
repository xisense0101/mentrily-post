/**
 * CancelAssessmentAttemptUseCase
 * Cancels an in-progress or not-started attempt.
 */

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
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AssessmentAttemptRepository } from '../../domain/repositories/index.js';
import { createAssessmentAttemptCancelledEvent } from '../../domain/events/index.js';
import { AssessmentEventPublisherService } from '../services/index.js';
import { mapAttemptToResponse } from '../mappers/index.js';
import { AssessmentAttemptResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';
import {
  GetLearnerAttemptProctoringUseCase,
  SyncAttemptTerminalProctoringUseCase,
} from '../../../proctoring/application/use-cases/proctoring.use-cases.js';

@Injectable()
export class CancelAssessmentAttemptUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(AssessmentEventPublisherService)
    private readonly eventPublisher: AssessmentEventPublisherService,
    @Inject(GetLearnerAttemptProctoringUseCase)
    private readonly getAttemptProctoring?: GetLearnerAttemptProctoringUseCase,
    @Inject(SyncAttemptTerminalProctoringUseCase)
    private readonly syncTerminalProctoring?: SyncAttemptTerminalProctoringUseCase,
  ) {}

  async execute(context: RequestContext, attemptId: string): Promise<AssessmentAttemptResponse> {
    const workspace = requireAssessmentActor(context);

    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_ATTEMPT_CANCEL, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const attempt = await this.attemptRepo.findById(attemptId, tx);
      if (
        !attempt ||
        attempt.workspaceId !== workspace.workspaceId ||
        attempt.tenantId !== workspace.tenantId
      ) {
        throw new AppError('NOT_FOUND', 'attempt not found', 404);
      }
      if (attempt.learnerPrincipalId !== workspace.actorId) {
        throw new AppError('FORBIDDEN', 'you do not own this attempt', 403);
      }

      attempt.cancel();

      const saved = await this.attemptRepo.save(attempt, tx);

      await this.auditRecorder.record(
        {
          action: 'assessment.attempt.cancelled',
          actorId: workspace.actorId,
          targetType: 'assessment-attempt',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        createAssessmentAttemptCancelledEvent(saved.id, saved.tenantId, saved.workspaceId, {
          assessmentId: saved.assessmentId,
          snapshotId: saved.snapshotId,
          learnerPrincipalId: saved.learnerPrincipalId,
        }),
        context,
        tx,
      );

      await this.syncTerminalProctoring?.execute(saved.id, 'CANCELLED', tx);
      const proctoring = this.getAttemptProctoring
        ? await this.getAttemptProctoring.execute(context, saved.id, tx)
        : undefined;
      return mapAttemptToResponse(saved, proctoring);
    });
  }
}
