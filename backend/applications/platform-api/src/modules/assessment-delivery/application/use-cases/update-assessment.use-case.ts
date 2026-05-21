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
  AttemptPolicy,
  AssessmentVisibility,
  ResultReleasePolicy,
  TimeLimit,
} from '../../domain/index.js';
import { AssessmentRepository } from '../../domain/repositories/index.js';
import { mapAssessmentToResponse } from '../mappers/index.js';
import { UpdateAssessmentInput, AssessmentResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class UpdateAssessmentUseCase {
  constructor(
    @Inject(AssessmentRepository) private readonly repo: AssessmentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
  ) {}

  async execute(
    context: RequestContext,
    assessmentId: string,
    input: UpdateAssessmentInput,
  ): Promise<AssessmentResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_UPDATE, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const assessment = await this.repo.findById(assessmentId, tx);
      if (!assessment || assessment.workspaceId !== workspace.workspaceId) {
        throw new AppError('NOT_FOUND', 'assessment not found', 404);
      }

      if (input.title !== undefined) assessment.rename(input.title);
      if (input.description !== undefined)
        assessment.updateDescription(input.description ?? undefined);
      if (input.visibility !== undefined)
        assessment.updateVisibility(input.visibility as AssessmentVisibility);
      if (input.attemptPolicy !== undefined) {
        assessment.updateAttemptPolicy(
          AttemptPolicy.create(
            input.attemptPolicy.maxAttempts !== undefined
              ? {
                  maxAttempts: input.attemptPolicy.maxAttempts,
                  allowRetake: input.attemptPolicy.allowRetake,
                  shuffleQuestions: input.attemptPolicy.shuffleQuestions,
                  shuffleOptions: input.attemptPolicy.shuffleOptions,
                }
              : {
                  allowRetake: input.attemptPolicy.allowRetake,
                  shuffleQuestions: input.attemptPolicy.shuffleQuestions,
                  shuffleOptions: input.attemptPolicy.shuffleOptions,
                },
          ),
        );
      }
      if (input.timeLimitMinutes !== undefined)
        assessment.updateTimeLimit(TimeLimit.create(input.timeLimitMinutes));
      if (input.resultReleasePolicy !== undefined) {
        assessment.updateResultReleasePolicy(input.resultReleasePolicy as ResultReleasePolicy);
      }
      if (input.metadata !== undefined) assessment.updateMetadata(input.metadata);

      const saved = await this.repo.save(assessment, tx);

      await this.auditRecorder.record(
        {
          action: 'assessment.updated',
          actorId: workspace.actorId,
          targetType: 'assessment',
          targetId: saved.id,
        },
        context,
        tx,
      );

      return mapAssessmentToResponse(saved);
    });
  }
}
