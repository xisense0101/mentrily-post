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
import { AssessmentGradeScore, AssessmentAttemptScore } from '../../domain/value-objects/index.js';
import {
  createAssessmentAnswerManuallyGradedEvent,
  createAssessmentAttemptResultUpdatedEvent,
} from '../../domain/events/index.js';
import { mapAssessmentGradingRunToResponse } from '../mappers/index.js';
import { ManualGradeAssessmentAnswerInput, AssessmentGradingRunResponse } from '../dto/index.js';
import { AssessmentEventPublisherService } from '../services/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class ManualGradeAssessmentAnswerUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(AssessmentGradingRepository) private readonly gradingRepo: AssessmentGradingRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(AssessmentEventPublisherService)
    private readonly eventPublisher: AssessmentEventPublisherService,
  ) {}

  async execute(
    context: RequestContext,
    gradingRunId: string,
    answerId: string,
    input: ManualGradeAssessmentAnswerInput,
  ): Promise<AssessmentGradingRunResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_GRADING_MANUAL_REVIEW, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const run = await this.gradingRepo.findRunById(gradingRunId, tx);
      if (
        !run ||
        run.workspaceId !== workspace.workspaceId ||
        run.tenantId !== workspace.tenantId
      ) {
        throw new AppError('NOT_FOUND', 'grading run not found', 404);
      }

      const grade = run.answerGrades.find((item) => item.answerId === answerId);
      if (!grade) {
        throw new AppError('NOT_FOUND', 'answer grade not found', 404);
      }

      const score = AssessmentGradeScore.create(input.score, grade.maxScore);
      grade.markManuallyGraded(score, workspace.actorId, input.feedback);

      const hasPendingManualReview = run.answerGrades.some(
        (item) => item.status === 'PENDING_MANUAL_REVIEW',
      );
      if (hasPendingManualReview) {
        run.markPartial();
      } else {
        run.markCompleted();
      }

      const savedRun = await this.gradingRepo.saveRun(run, tx);
      const attempt = await this.attemptRepo.findById(run.attemptId, tx);
      if (
        !attempt ||
        attempt.workspaceId !== workspace.workspaceId ||
        attempt.tenantId !== workspace.tenantId
      ) {
        throw new AppError('NOT_FOUND', 'attempt not found', 404);
      }
      if (!attempt.result) {
        throw new AppError('VALIDATION_ERROR', 'attempt result placeholder missing', 400);
      }

      if (savedRun.answerGrades.some((item) => item.status === 'PENDING_MANUAL_REVIEW')) {
        attempt.result.markPendingManualReview();
      } else {
        attempt.result.markGraded(
          AssessmentAttemptScore.create(savedRun.totalScore?.value ?? 0),
          AssessmentAttemptScore.create(savedRun.maxScore?.value ?? 0),
        );
      }
      await this.attemptRepo.save(attempt, tx);

      await this.auditRecorder.record(
        {
          action: 'assessment.answer.manually_graded',
          actorId: workspace.actorId,
          targetType: 'assessment-attempt-answer',
          targetId: answerId,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        createAssessmentAnswerManuallyGradedEvent(
          savedRun.id,
          savedRun.tenantId,
          savedRun.workspaceId,
          {
            attemptId: savedRun.attemptId,
            assessmentId: savedRun.assessmentId,
            snapshotId: savedRun.snapshotId,
            questionId: grade.questionId,
            answerId: grade.answerId,
            score: grade.score?.value ?? 0,
            maxScore: grade.maxScore.value,
            gradedByPrincipalId: workspace.actorId,
          },
        ),
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        createAssessmentAttemptResultUpdatedEvent(
          attempt.id,
          attempt.tenantId,
          attempt.workspaceId,
          {
            attemptId: attempt.id,
            assessmentId: attempt.assessmentId,
            snapshotId: attempt.snapshotId,
            gradingStatus: attempt.result.gradingStatus,
            ...(attempt.result.score !== undefined
              ? { totalScore: attempt.result.score.value }
              : {}),
            ...(attempt.result.maxScore !== undefined
              ? { maxScore: attempt.result.maxScore.value }
              : {}),
          },
        ),
        context,
        tx,
      );

      return mapAssessmentGradingRunToResponse(savedRun);
    });
  }
}
