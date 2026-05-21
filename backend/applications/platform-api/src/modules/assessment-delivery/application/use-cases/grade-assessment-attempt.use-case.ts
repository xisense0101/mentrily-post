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
import { PermissionCatalog } from '@mentrily/security-toolkit';
import {
  AssessmentAttemptRepository,
  AssessmentGradingRepository,
  AssessmentSnapshotRepository,
} from '../../domain/repositories/index.js';
import {
  AssessmentAutoGradingService,
  AssessmentGradingPolicyService,
} from '../../domain/services/index.js';
import {
  AssessmentAttemptScore,
  AssessmentAttemptGradingStatusEnum,
} from '../../domain/value-objects/index.js';
import {
  createAssessmentAnswerAutoGradedEvent,
  createAssessmentAnswerPendingManualReviewEvent,
  createAssessmentAttemptResultUpdatedEvent,
  createAssessmentGradingRunCompletedEvent,
  createAssessmentGradingRunPartialEvent,
  createAssessmentGradingRunStartedEvent,
} from '../../domain/events/index.js';
import { AssessmentGradingRun } from '../../domain/entities/index.js';
import { mapAssessmentGradingRunToResponse } from '../mappers/index.js';
import { AssessmentGradingRunResponse } from '../dto/index.js';
import {
  AssessmentEventPublisherService,
  AssessmentExecutionReservationService,
} from '../services/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class GradeAssessmentAttemptUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(AssessmentSnapshotRepository)
    private readonly snapshotRepo: AssessmentSnapshotRepository,
    @Inject(AssessmentGradingRepository) private readonly gradingRepo: AssessmentGradingRepository,
    @Inject(AssessmentAutoGradingService)
    private readonly autoGrading: AssessmentAutoGradingService,
    @Inject(AssessmentGradingPolicyService)
    private readonly gradingPolicy: AssessmentGradingPolicyService,
    @Inject(AssessmentExecutionReservationService)
    private readonly executionReservation: AssessmentExecutionReservationService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(AssessmentEventPublisherService)
    private readonly eventPublisher: AssessmentEventPublisherService,
  ) {}

  async execute(context: RequestContext, attemptId: string): Promise<AssessmentGradingRunResponse> {
    const workspace = requireAssessmentActor(context);

    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_GRADING_RUN, workspace },
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

      const policy = this.gradingPolicy.canGradeAttempt(attempt);
      if (!policy.allowed) {
        throw new AppError('VALIDATION_ERROR', policy.reason ?? 'Attempt cannot be graded', 400);
      }

      const snapshot = await this.snapshotRepo.findById(attempt.snapshotId, tx);
      if (!snapshot || snapshot.assessmentId !== attempt.assessmentId) {
        throw new AppError('NOT_FOUND', 'attempt snapshot not found', 404);
      }

      const run = AssessmentGradingRun.start({
        id: randomUUID(),
        tenantId: attempt.tenantId,
        workspaceId: attempt.workspaceId,
        attemptId: attempt.id,
        assessmentId: attempt.assessmentId,
        snapshotId: attempt.snapshotId,
        triggeredByPrincipalId: workspace.actorId,
      });

      await this.eventPublisher.publishDomainEvent(
        createAssessmentGradingRunStartedEvent(run.id, run.tenantId, run.workspaceId, {
          attemptId: run.attemptId,
          assessmentId: run.assessmentId,
          snapshotId: run.snapshotId,
        }),
        context,
        tx,
      );

      const questionMap = new Map(
        snapshot.getAllQuestions().map((question) => [question.id, question]),
      );
      for (const answer of attempt.answers.filter((item) => item.isSubmitted())) {
        const question = questionMap.get(answer.questionId);
        if (!question) {
          throw new AppError(
            'VALIDATION_ERROR',
            `Snapshot question not found for answer ${answer.id}`,
            400,
          );
        }
        const grade = this.autoGrading.gradeAnswer({
          attemptId: attempt.id,
          answer,
          question,
          gradingRunId: run.id,
        });

        this.executionReservation.createReservedExecutionRequest({
          context,
          attemptId: attempt.id,
          answerId: answer.id,
          questionId: question.id,
          questionKind: question.kind,
          answer: answer.answer,
        });

        run.addAnswerGrade(grade);
      }

      const hasPendingManualReview = run.answerGrades.some(
        (grade) => grade.status === 'PENDING_MANUAL_REVIEW',
      );
      if (hasPendingManualReview) {
        run.markPartial();
      } else {
        run.markCompleted();
      }

      const savedRun = await this.gradingRepo.saveRun(run, tx);

      const result = attempt.result;
      if (!result) {
        throw new AppError('VALIDATION_ERROR', 'attempt result placeholder missing', 400);
      }

      result.clearRelease();
      if (hasPendingManualReview) {
        result.markPendingManualReview();
      } else {
        result.markGraded(
          AssessmentAttemptScore.create(savedRun.totalScore?.value ?? 0),
          AssessmentAttemptScore.create(savedRun.maxScore?.value ?? 0),
        );
      }
      await this.attemptRepo.save(attempt, tx);

      await this.auditRecorder.record(
        {
          action: 'assessment.grading.run',
          actorId: workspace.actorId,
          targetType: 'assessment-attempt',
          targetId: attempt.id,
        },
        context,
        tx,
      );

      for (const grade of savedRun.answerGrades) {
        if (grade.status === 'AUTO_GRADED') {
          await this.eventPublisher.publishDomainEvent(
            createAssessmentAnswerAutoGradedEvent(
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
              },
            ),
            context,
            tx,
          );
        } else if (grade.status === 'PENDING_MANUAL_REVIEW') {
          await this.eventPublisher.publishDomainEvent(
            createAssessmentAnswerPendingManualReviewEvent(
              savedRun.id,
              savedRun.tenantId,
              savedRun.workspaceId,
              {
                attemptId: savedRun.attemptId,
                assessmentId: savedRun.assessmentId,
                snapshotId: savedRun.snapshotId,
                questionId: grade.questionId,
                answerId: grade.answerId,
              },
            ),
            context,
            tx,
          );
        }
      }

      await this.eventPublisher.publishDomainEvent(
        hasPendingManualReview
          ? createAssessmentGradingRunPartialEvent(
              savedRun.id,
              savedRun.tenantId,
              savedRun.workspaceId,
              {
                attemptId: savedRun.attemptId,
                assessmentId: savedRun.assessmentId,
                snapshotId: savedRun.snapshotId,
                totalScore: savedRun.totalScore?.value ?? 0,
                maxScore: savedRun.maxScore?.value ?? 0,
              },
            )
          : createAssessmentGradingRunCompletedEvent(
              savedRun.id,
              savedRun.tenantId,
              savedRun.workspaceId,
              {
                attemptId: savedRun.attemptId,
                assessmentId: savedRun.assessmentId,
                snapshotId: savedRun.snapshotId,
                totalScore: savedRun.totalScore?.value ?? 0,
                maxScore: savedRun.maxScore?.value ?? 0,
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
            gradingStatus: hasPendingManualReview
              ? AssessmentAttemptGradingStatusEnum.PENDING_MANUAL_REVIEW
              : AssessmentAttemptGradingStatusEnum.GRADED,
            ...(savedRun.totalScore !== undefined ? { totalScore: savedRun.totalScore.value } : {}),
            ...(savedRun.maxScore !== undefined ? { maxScore: savedRun.maxScore.value } : {}),
          },
        ),
        context,
        tx,
      );

      return mapAssessmentGradingRunToResponse(savedRun);
    });
  }
}
