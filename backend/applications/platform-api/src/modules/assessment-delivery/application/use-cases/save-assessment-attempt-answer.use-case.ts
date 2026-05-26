/**
 * SaveAssessmentAttemptAnswerUseCase
 * Saves or updates a learner's answer for a question within an in-progress attempt.
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
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { MediaAssetRepository } from '../../../media-library/domain/repositories/index.js';
import {
  AssessmentAttemptRepository,
  AssessmentSnapshotRepository,
} from '../../domain/repositories/index.js';
import { AssessmentAttemptSubmissionPolicyService } from '../../domain/services/index.js';
import { createAssessmentAttemptAnswerSavedEvent } from '../../domain/events/index.js';
import { AssessmentEventPublisherService } from '../services/index.js';
import { mapAttemptToResponse } from '../mappers/index.js';
import { AssessmentAttemptResponse, SaveAssessmentAttemptAnswerInput } from '../dto/index.js';
import {
  createAssessmentAttemptConflictError,
  requireAssessmentActor,
  validateFileUploadAnswer,
} from '../support/index.js';
import { assertValidQuestionKind } from '../../domain/value-objects/index.js';
import {
  GetLearnerAttemptProctoringUseCase,
  SyncAttemptTerminalProctoringUseCase,
} from '../../../proctoring/application/use-cases/proctoring.use-cases.js';

@Injectable()
export class SaveAssessmentAttemptAnswerUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(AssessmentSnapshotRepository)
    private readonly snapshotRepository: AssessmentSnapshotRepository,
    @Inject(MediaAssetRepository) private readonly mediaAssetRepository: MediaAssetRepository,
    @Inject(AssessmentAttemptSubmissionPolicyService)
    private readonly submissionPolicy: AssessmentAttemptSubmissionPolicyService,
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

  async execute(
    context: RequestContext,
    attemptId: string,
    input: SaveAssessmentAttemptAnswerInput,
  ): Promise<AssessmentAttemptResponse> {
    const workspace = requireAssessmentActor(context);

    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_ATTEMPT_ANSWER_SAVE, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const result = await this.transactionRunner.run<
      AssessmentAttemptResponse | { conflict: AppError }
    >(async (tx) => {
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

      const snapshot = await this.snapshotRepository.findById(attempt.snapshotId, tx);
      if (!snapshot) {
        throw new AppError('NOT_FOUND', 'assessment snapshot not found', 404);
      }

      const question = snapshot
        .getAllQuestions()
        .find((candidate) => candidate.id === input.questionId);
      if (!question) {
        throw new AppError('VALIDATION_ERROR', 'question not found in assessment snapshot', 400);
      }

      let normalizedAnswer = input.answer;
      if (input.questionKind === 'FILE_UPLOAD') {
        normalizedAnswer = await validateFileUploadAnswer({
          assetRepository: this.mediaAssetRepository,
          context,
          actorId: workspace.actorId,
          question,
          answer: input.answer,
          attemptId: attempt.id,
          assessmentId: attempt.assessmentId,
        });
      }

      const now = new Date();
      const policyResult = this.submissionPolicy.canSaveAnswer(attempt, now);
      if (!policyResult.allowed) {
        if (attempt.isInProgress() && attempt.isSessionExpired(now)) {
          attempt.expire();
          attempt.touchSession(now);
          await this.attemptRepo.save(attempt, tx);
          await this.syncTerminalProctoring?.execute(attempt.id, 'EXPIRED', tx);
          return {
            conflict: createAssessmentAttemptConflictError({
              reason: 'ATTEMPT_EXPIRED',
              message: policyResult.reason ?? 'Cannot save answer',
              attempt,
            }),
          };
        }
        throw createAssessmentAttemptConflictError({
          reason: 'ATTEMPT_NOT_EDITABLE',
          message: policyResult.reason ?? 'Cannot save answer',
          attempt,
        });
      }

      const answerId = randomUUID();
      attempt.saveAnswer({
        answerId,
        questionId: input.questionId,
        questionKind: assertValidQuestionKind(input.questionKind),
        answer: normalizedAnswer,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      });
      attempt.touchSession(now);

      const saved = await this.attemptRepo.save(attempt, tx);

      await this.auditRecorder.record(
        {
          action: 'assessment.attempt.answer_saved',
          actorId: workspace.actorId,
          targetType: 'assessment-attempt',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        createAssessmentAttemptAnswerSavedEvent(saved.id, saved.tenantId, saved.workspaceId, {
          assessmentId: saved.assessmentId,
          snapshotId: saved.snapshotId,
          learnerPrincipalId: saved.learnerPrincipalId,
          questionId: input.questionId,
          questionKind: input.questionKind,
        }),
        context,
        tx,
      );

      const proctoring = this.getAttemptProctoring
        ? await this.getAttemptProctoring.execute(context, saved.id, tx)
        : undefined;
      return mapAttemptToResponse(saved, proctoring);
    });

    if ('conflict' in result) {
      throw result.conflict;
    }

    return result;
  }
}
