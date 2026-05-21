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
  ContentDocumentRepository,
  ContentSnapshotRepository,
} from '../../domain/repositories/index.js';
import {
  ContentPublishPolicyService,
  ContentPublishedSnapshot,
} from '../../domain/index.js';
import {
  contentDocumentPublished,
  contentSnapshotCreated,
} from '../../domain/events/index.js';
import { ContentEventPublisherService } from '../services/index.js';
import { ContentDocumentResponse, PublishContentDocumentInput } from '../dto/index.js';
import { mapContentDocumentToResponse } from '../mappers/index.js';
import { ensureDocumentOwnership, requireContentActor } from '../support/index.js';

@Injectable()
export class PublishContentDocumentUseCase {
  constructor(
    @Inject(ContentDocumentRepository) private readonly repo: ContentDocumentRepository,
    @Inject(ContentSnapshotRepository) private readonly snapshotRepo: ContentSnapshotRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(ContentEventPublisherService)
    private readonly eventPublisher: ContentEventPublisherService,
    @Inject(ContentPublishPolicyService)
    private readonly publishPolicy: ContentPublishPolicyService,
  ) {}

  async execute(
    context: RequestContext,
    documentId: string,
    _input: PublishContentDocumentInput,
  ): Promise<ContentDocumentResponse> {
    const workspace = requireContentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CONTENT_DOCUMENT_PUBLISH, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const document = await this.repo.findById(documentId, tx);
      if (!document || !document.currentDraftVersion) {
        throw new AppError('NOT_FOUND', 'content document not found', 404);
      }

      ensureDocumentOwnership(document, context);
      const policy = this.publishPolicy.canPublish(document);
      if (!policy.allowed) {
        throw new AppError('CONFLICT', policy.reason ?? 'document cannot publish', 409);
      }

      document.currentDraftVersion.publishSnapshot();
      const snapshot = ContentPublishedSnapshot.createFromVersion({
        id: randomUUID(),
        version: document.currentDraftVersion,
        publishedByPrincipalId: workspace.actorId,
      });
      document.publish(snapshot);

      const savedDocument = await this.repo.save(document, tx);
      const savedSnapshot = await this.snapshotRepo.save(snapshot, tx);

      await this.auditRecorder.record(
        {
          action: 'content.document.published',
          actorId: workspace.actorId,
          targetType: 'content.document',
          targetId: savedDocument.id,
          metadata: {
            snapshotId: savedSnapshot.id,
            versionId: savedSnapshot.versionId,
            versionNumber: savedSnapshot.versionNumber,
          },
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        contentDocumentPublished({
          tenantId: savedDocument.tenantId,
          workspaceId: savedDocument.workspaceId,
          documentId: savedDocument.id,
          versionId: savedSnapshot.versionId,
          snapshotId: savedSnapshot.id,
          versionNumber: savedSnapshot.versionNumber,
        }),
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        contentSnapshotCreated({
          tenantId: savedDocument.tenantId,
          workspaceId: savedDocument.workspaceId,
          documentId: savedDocument.id,
          snapshotId: savedSnapshot.id,
          versionId: savedSnapshot.versionId,
          versionNumber: savedSnapshot.versionNumber,
        }),
        context,
        tx,
      );

      savedDocument.publishedSnapshot = savedSnapshot;
      return mapContentDocumentToResponse(savedDocument);
    });
  }
}
