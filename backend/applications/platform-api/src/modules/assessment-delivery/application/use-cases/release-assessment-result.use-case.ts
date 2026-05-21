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
import {
  AssessmentAttemptRepository,
  AssessmentGradingRepository,
} from '../../domain/repositories/index.js';
import { AssessmentResultReleasePolicyService } from '../../domain/services/index.js';
import { createAssessmentResultReleasedEvent } from '../../domain/events/index.js';
import { mapInstructorAssessmentResultToResponse } from '../mappers/index.js';
import {
  type AssessmentInstructorResultResponse,
  type ReleaseAssessmentResultInput,
} from '../dto/index.js';
import { AssessmentEventPublisherService } from '../services/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class ReleaseAssessmentResultUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(AssessmentGradingRepository) private readonly gradingRepo: AssessmentGradingRepository,
    @Inject(AssessmentResultReleasePolicyService)
    private readonly releasePolicy: AssessmentResultReleasePolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(AssessmentEventPublisherService)
    private readonly eventPublisher: AssessmentEventPublisherService,
  ) {}

  async execute(
    context: RequestContext,
    attemptId: string,
    _input?: ReleaseAssessmentResultInput,
  ): Promise<AssessmentInstructorResultResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_RESULT_RELEASE, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const attempt = await this.attemptRepo.findById(attemptId, tx);
      if (
        !attempt ||
        attempt.workspaceId != workspace.workspaceId ||
        attempt.tenantId != workspace.tenantId
      ) {
        throw new AppError('NOT_FOUND', 'attempt not found', 404);
      }
      if (!attempt.result) {
        throw new AppError('VALIDATION_ERROR', 'attempt result missing', 400);
      }

      const latestRun = await this.gradingRepo.findLatestRunByAttemptId(attempt.id, tx);
      const hasPendingManualReview =
        latestRun?.answerGrades.some((grade) => grade.status === 'PENDING_MANUAL_REVIEW') ?? false;
      const decision = this.releasePolicy.canReleaseResult({
        attemptStatus: attempt.status,
        gradingStatus: attempt.result.gradingStatus,
        ...(attempt.result.releasedAt !== undefined
          ? { releasedAt: attempt.result.releasedAt }
          : {}),
        hasPendingManualReview,
      });
      if (!decision.allowed) {
        throw new AppError('VALIDATION_ERROR', decision.reason ?? 'result cannot be released', 400);
      }
      if (!latestRun || (latestRun.status !== 'COMPLETED' && latestRun.status !== 'PARTIAL')) {
        throw new AppError('VALIDATION_ERROR', 'latest grading run is not complete', 400);
      }

      attempt.releaseResult();
      const saved = await this.attemptRepo.save(attempt, tx);
      const savedResult = saved.result;
      if (!savedResult) {
        throw new AppError('VALIDATION_ERROR', 'attempt result missing after release', 500);
      }

      await this.auditRecorder.record(
        {
          action: 'assessment.result.released',
          actorId: workspace.actorId,
          targetType: 'assessment-attempt-result',
          targetId: savedResult.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        createAssessmentResultReleasedEvent(saved.id, saved.tenantId, saved.workspaceId, {
          attemptId: saved.id,
          assessmentId: saved.assessmentId,
          snapshotId: saved.snapshotId,
          learnerPrincipalId: saved.learnerPrincipalId,
          ...(savedResult.score !== undefined ? { score: savedResult.score.value } : {}),
          ...(savedResult.maxScore !== undefined ? { maxScore: savedResult.maxScore.value } : {}),
          releasedAt: savedResult.releasedAt!.toISOString(),
        }),
        context,
        tx,
      );

      return mapInstructorAssessmentResultToResponse(saved, latestRun);
    });
  }
}
