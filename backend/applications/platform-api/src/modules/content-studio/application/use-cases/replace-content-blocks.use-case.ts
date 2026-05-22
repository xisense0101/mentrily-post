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
  BlockContentKind,
  BlockTreePath,
  ContentBlock,
  BlockTreePolicyService,
} from '../../domain/index.js';
import { ContentDocumentRepository } from '../../domain/repositories/index.js';
import { contentDocumentDraftBlocksReplaced } from '../../domain/events/index.js';
import { ContentEventPublisherService } from '../services/index.js';
import { ContentDocumentResponse, ReplaceContentBlocksInput } from '../dto/index.js';
import { mapContentDocumentToResponse } from '../mappers/index.js';
import { ensureDocumentOwnership, requireContentActor, validateContentMediaReferences } from '../support/index.js';

@Injectable()
export class ReplaceContentBlocksUseCase {
  constructor(
    @Inject(ContentDocumentRepository) private readonly repo: ContentDocumentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(ContentEventPublisherService)
    private readonly eventPublisher: ContentEventPublisherService,
    @Inject(BlockTreePolicyService)
    private readonly blockTreePolicy: BlockTreePolicyService,
    @Inject(MediaAssetRepository)
    private readonly mediaAssetRepo: MediaAssetRepository,
  ) {}

  async execute(
    context: RequestContext,
    documentId: string,
    input: ReplaceContentBlocksInput,
  ): Promise<ContentDocumentResponse> {
    const workspace = requireContentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CONTENT_DOCUMENT_UPDATE, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    if (input.blocks && input.blocks.length > 0) {
      await validateContentMediaReferences(this.mediaAssetRepo, context, input.blocks);
    }

    return this.transactionRunner.run(async (tx) => {
      const document = await this.repo.findById(documentId, tx);
      if (!document || !document.currentDraftVersion) {
        throw new AppError('NOT_FOUND', 'content document not found', 404);
      }

      ensureDocumentOwnership(document, context);
      const blocks = input.blocks.map((block) =>
        ContentBlock.create({
          id: block.id,
          documentId: document.id,
          ...(block.parentBlockId ? { parentBlockId: block.parentBlockId } : {}),
          kind: block.kind as BlockContentKind,
          position: block.position,
          path: new BlockTreePath(block.path.split('.').map((segment) => Number.parseInt(segment, 10))),
          content: block.content,
          metadata: block.metadata ?? {},
        }),
      );

      const validation = this.blockTreePolicy.validateTree({ blocks });
      if (!validation.valid) {
        throw new AppError('VALIDATION_ERROR', validation.reason ?? 'invalid block tree', 400);
      }

      document.replaceDraftBlocks(blocks);
      const saved = await this.repo.save(document, tx);

      await this.auditRecorder.record(
        {
          action: 'content.document.draft_blocks_replaced',
          actorId: workspace.actorId,
          targetType: 'content.document',
          targetId: saved.id,
          metadata: {
            versionId: saved.currentDraftVersion?.id,
            blockCount: saved.currentDraftVersion?.blocks.length ?? 0,
          },
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        contentDocumentDraftBlocksReplaced({
          tenantId: saved.tenantId,
          workspaceId: saved.workspaceId,
          documentId: saved.id,
          versionId: saved.currentDraftVersion?.id ?? '',
          blockCount: saved.currentDraftVersion?.blocks.length ?? 0,
        }),
        context,
        tx,
      );

      return mapContentDocumentToResponse(saved);
    });
  }
}
