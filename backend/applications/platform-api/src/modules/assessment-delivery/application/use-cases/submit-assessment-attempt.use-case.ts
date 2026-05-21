/**
 * SubmitAssessmentAttemptUseCase
 * Submits an in-progress attempt, creates a result placeholder, and publishes events.
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
import { PrismaService, getPrismaClient } from '@mentrily/data-platform';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AssessmentAttemptRepository } from '../../domain/repositories/index.js';
import { AssessmentAttemptSubmissionPolicyService } from '../../domain/services/index.js';
import {
  createAssessmentAttemptSubmittedEvent,
  createAssessmentAttemptResultPlaceholderCreatedEvent,
} from '../../domain/events/index.js';
import { AssessmentEventPublisherService } from '../services/index.js';
import { mapAttemptToResponse } from '../mappers/index.js';
import { AssessmentAttemptResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class SubmitAssessmentAttemptUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(AssessmentAttemptSubmissionPolicyService)
    private readonly submissionPolicy: AssessmentAttemptSubmissionPolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(AssessmentEventPublisherService)
    private readonly eventPublisher: AssessmentEventPublisherService,
  ) {}

  async execute(context: RequestContext, attemptId: string): Promise<AssessmentAttemptResponse> {
    const workspace = requireAssessmentActor(context);

    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_ATTEMPT_SUBMIT, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const result = await this.transactionRunner.run<
      AssessmentAttemptResponse | { expired: true; reason: string }
    >(async (tx) => {
      const client = getPrismaClient(this.prisma, tx);
      await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`assessment-attempt-submit:${attemptId}`})::bigint)`;

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

      if (attempt.isSubmitted()) {
        return mapAttemptToResponse(attempt);
      }

      const now = new Date();
      const policyResult = this.submissionPolicy.canSubmit(attempt, now);
      if (!policyResult.allowed) {
        if (attempt.isInProgress() && attempt.isSessionExpired(now)) {
          attempt.expire();
          await this.attemptRepo.save(attempt, tx);
          return {
            expired: true,
            reason: policyResult.reason ?? 'Cannot submit attempt',
          };
        }
        throw new AppError('VALIDATION_ERROR', policyResult.reason ?? 'Cannot submit attempt', 400);
      }

      const resultId = randomUUID();
      const result = attempt.submit(resultId);

      const saved = await this.attemptRepo.save(attempt, tx);

      await this.auditRecorder.record(
        {
          action: 'assessment.attempt.submitted',
          actorId: workspace.actorId,
          targetType: 'assessment-attempt',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        createAssessmentAttemptSubmittedEvent(saved.id, saved.tenantId, saved.workspaceId, {
          assessmentId: saved.assessmentId,
          snapshotId: saved.snapshotId,
          learnerPrincipalId: saved.learnerPrincipalId,
          answerCount: saved.answers.length,
        }),
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        createAssessmentAttemptResultPlaceholderCreatedEvent(
          saved.id,
          saved.tenantId,
          saved.workspaceId,
          {
            assessmentId: saved.assessmentId,
            snapshotId: saved.snapshotId,
            learnerPrincipalId: saved.learnerPrincipalId,
            resultId: result.id,
            gradingStatus: result.gradingStatus,
          },
        ),
        context,
        tx,
      );

      return mapAttemptToResponse(saved);
    });

    if ('expired' in result) {
      throw new AppError('VALIDATION_ERROR', result.reason, 400);
    }

    return result;
  }
}
