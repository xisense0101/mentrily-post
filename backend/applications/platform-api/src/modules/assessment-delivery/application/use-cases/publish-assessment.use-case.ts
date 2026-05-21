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
  AssessmentRepository,
  AssessmentSnapshotRepository,
} from '../../domain/repositories/index.js';
import {
  createAssessmentPublishedEvent,
  createAssessmentSnapshotCreatedEvent,
} from '../../domain/events/index.js';
import { AssessmentEventPublisherService } from '../services/index.js';
import { mapAssessmentToResponse } from '../mappers/index.js';
import { AssessmentResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class PublishAssessmentUseCase {
  constructor(
    @Inject(AssessmentRepository) private readonly repo: AssessmentRepository,
    @Inject(AssessmentSnapshotRepository)
    private readonly snapshotRepo: AssessmentSnapshotRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(AssessmentEventPublisherService)
    private readonly eventPublisher: AssessmentEventPublisherService,
  ) {}

  async execute(context: RequestContext, assessmentId: string): Promise<AssessmentResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_PUBLISH, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner
      .run(async (tx) => {
        const assessment = await this.repo.findById(assessmentId, tx);
        if (!assessment || assessment.workspaceId !== workspace.workspaceId) {
          throw new AppError('NOT_FOUND', 'assessment not found', 404);
        }

        const snapshotId = randomUUID();
        assessment.publish(workspace.actorId, snapshotId, new Date());

        const savedSnapshot = await this.snapshotRepo.save(assessment.publishedSnapshot!, tx);

        // 3. Persist assessment state change
        const saved = await this.repo.save(assessment, tx);

        // 4. Audit
        await this.auditRecorder.record(
          {
            action: 'assessment.published',
            actorId: workspace.actorId,
            targetType: 'assessment',
            targetId: saved.id,
            metadata: { snapshotId: savedSnapshot.id },
          },
          context,
          tx,
        );

        // 5. Events
        await this.eventPublisher.publishDomainEvent(
          createAssessmentPublishedEvent(saved.id, saved.tenantId, saved.workspaceId, {
            draftVersionNumber: savedSnapshot.versionNumber,
            snapshotVersionNumber: savedSnapshot.versionNumber,
            publishedByPrincipalId: workspace.actorId,
            questionCount: savedSnapshot.getAllQuestions().length,
            totalPoints: savedSnapshot
              .getAllQuestions()
              .reduce((sum, q) => sum + q.points.value(), 0),
          }),
          context,
          tx,
        );

        await this.eventPublisher.publishDomainEvent(
          createAssessmentSnapshotCreatedEvent(saved.id, saved.tenantId, saved.workspaceId, {
            snapshotId: savedSnapshot.id,
            versionNumber: savedSnapshot.versionNumber,
            publishedByPrincipalId: workspace.actorId,
            questionCount: savedSnapshot.getAllQuestions().length,
          }),
          context,
          tx,
        );

        return mapAssessmentToResponse(saved);
      })
      .catch((error) => {
        console.error('[PublishAssessmentUseCase.execute] failed', error);
        throw error;
      });
  }
}
