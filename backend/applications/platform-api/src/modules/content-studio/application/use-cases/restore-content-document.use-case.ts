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
import { ContentDocumentRepository } from '../../domain/repositories/index.js';
import {
  ContentBlock,
  ContentVersion,
} from '../../domain/entities/index.js';
import { ContentVersionStatus } from '../../domain/value-objects/index.js';
import { mapContentDocumentToResponse } from '../mappers/index.js';
import { ContentDocumentResponse } from '../dto/index.js';
import { ensureDocumentOwnership, requireContentActor } from '../support/index.js';

@Injectable()
export class RestoreContentDocumentUseCase {
  constructor(
    @Inject(ContentDocumentRepository) private readonly repo: ContentDocumentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
  ) {}

  async execute(context: RequestContext, documentId: string): Promise<ContentDocumentResponse> {
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
      let nextDraftVersion = document.currentDraftVersion;

      if (!nextDraftVersion) {
        throw new AppError('CONFLICT', 'document has no version to restore', 409);
      }

      if (nextDraftVersion.status !== ContentVersionStatus.DRAFT) {
        const blockIdMap = new Map<string, string>();
        for (const block of nextDraftVersion.blocks) {
          blockIdMap.set(block.id, randomUUID());
        }

        nextDraftVersion = ContentVersion.createDraft({
          id: randomUUID(),
          documentId: document.id,
          versionNumber: nextDraftVersion.versionNumber + 1,
          createdByPrincipalId: workspace.actorId,
          blocks: nextDraftVersion.blocks.map((block) => {
            const newId = blockIdMap.get(block.id)!;
            const newParentId = block.parentBlockId ? blockIdMap.get(block.parentBlockId) : undefined;
            return new ContentBlock({
              id: newId,
              documentId: block.documentId,
              ...(newParentId ? { parentBlockId: newParentId } : {}),
              kind: block.kind,
              position: block.position,
              path: block.path,
              content: block.content,
              metadata: block.metadata,
              createdAt: block.createdAt,
              updatedAt: block.updatedAt,
            });
          }),
        });
      }

      document.restoreToDraft(nextDraftVersion);
      const saved = await this.repo.save(document, tx);
      await this.auditRecorder.record(
        {
          action: 'content.document.restored_to_draft',
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
