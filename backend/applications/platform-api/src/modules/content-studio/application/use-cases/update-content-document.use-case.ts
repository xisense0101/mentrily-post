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
import { ContentDocumentResponse, UpdateContentDocumentInput } from '../dto/index.js';
import { mapContentDocumentToResponse } from '../mappers/index.js';
import { ensureDocumentOwnership, requireContentActor } from '../support/index.js';

@Injectable()
export class UpdateContentDocumentUseCase {
  constructor(
    @Inject(ContentDocumentRepository) private readonly repo: ContentDocumentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
  ) {}

  async execute(
    context: RequestContext,
    documentId: string,
    input: UpdateContentDocumentInput,
  ): Promise<ContentDocumentResponse> {
    const workspace = requireContentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CONTENT_DOCUMENT_UPDATE, workspace },
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
      if (input.title !== undefined) {
        document.rename(input.title);
      }

      const saved = await this.repo.save(document, tx);
      await this.auditRecorder.record(
        {
          action: 'content.document.updated',
          actorId: workspace.actorId,
          targetType: 'content.document',
          targetId: saved.id,
        },
        context,
        tx,
      );

      return mapContentDocumentToResponse(saved);
    });
  }
}
