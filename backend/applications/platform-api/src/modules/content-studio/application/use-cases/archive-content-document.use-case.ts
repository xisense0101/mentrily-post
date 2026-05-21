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
import { ContentDocumentRepository } from '../../domain/repositories/index.js';
import { contentDocumentArchived } from '../../domain/events/index.js';
import { ContentEventPublisherService } from '../services/index.js';
import { ContentDocumentResponse } from '../dto/index.js';
import { mapContentDocumentToResponse } from '../mappers/index.js';
import { ensureDocumentOwnership, requireContentActor } from '../support/index.js';

@Injectable()
export class ArchiveContentDocumentUseCase {
  constructor(
    @Inject(ContentDocumentRepository) private readonly repo: ContentDocumentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(ContentEventPublisherService)
    private readonly eventPublisher: ContentEventPublisherService,
  ) {}

  async execute(context: RequestContext, documentId: string): Promise<ContentDocumentResponse> {
    const workspace = requireContentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CONTENT_DOCUMENT_ARCHIVE, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const document = await this.repo.findById(documentId, tx);
      if (!document) {
        throw new AppError('NOT_FOUND', 'content document not found', 404);
      }

      ensureDocumentOwnership(document, context);
      document.archive();
      const saved = await this.repo.save(document, tx);

      await this.auditRecorder.record(
        {
          action: 'content.document.archived',
          actorId: workspace.actorId,
          targetType: 'content.document',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        contentDocumentArchived({
          tenantId: saved.tenantId,
          workspaceId: saved.workspaceId,
          documentId: saved.id,
        }),
        context,
        tx,
      );

      return mapContentDocumentToResponse(saved);
    });
  }
}
