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
import { AssessmentRepository } from '../../domain/repositories/index.js';
import { createAssessmentRestoredToDraftEvent } from '../../domain/events/index.js';
import { AssessmentEventPublisherService } from '../services/index.js';
import { mapAssessmentToResponse } from '../mappers/index.js';
import { AssessmentResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class RestoreAssessmentUseCase {
  constructor(
    @Inject(AssessmentRepository) private readonly repo: AssessmentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(AssessmentEventPublisherService)
    private readonly eventPublisher: AssessmentEventPublisherService,
  ) {}

  async execute(context: RequestContext, assessmentId: string): Promise<AssessmentResponse> {
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
      const previousStatus = assessment.status;

      assessment.restoreToDraft();

      const saved = await this.repo.save(assessment, tx);

      await this.auditRecorder.record(
        {
          action: 'assessment.restored_to_draft',
          actorId: workspace.actorId,
          targetType: 'assessment',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        createAssessmentRestoredToDraftEvent(saved.id, saved.tenantId, saved.workspaceId, {
          previousStatus: String(previousStatus),
          restoredAt: new Date(),
        }),
        context,
        tx,
      );

      return mapAssessmentToResponse(saved);
    });
  }
}
