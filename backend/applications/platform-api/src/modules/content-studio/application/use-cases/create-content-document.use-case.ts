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
  ContentBlock,
  ContentDocument,
  ContentVersion,
  BlockContentKind,
  BlockTreePath,
  ContentDocumentPurpose,
} from '../../domain/index.js';
import { ContentDocumentRepository } from '../../domain/repositories/index.js';
import { contentDocumentCreated } from '../../domain/events/index.js';
import { ContentEventPublisherService } from '../services/index.js';
import { mapContentDocumentToResponse } from '../mappers/index.js';
import { CreateContentDocumentInput, ContentDocumentResponse } from '../dto/index.js';
import { requireContentActor } from '../support/index.js';

function mapBlocks(documentId: string, blocks: CreateContentDocumentInput['blocks']): ContentBlock[] {
  return (blocks ?? []).map((block) =>
    ContentBlock.create({
      id: block.id,
      documentId,
      ...(block.parentBlockId ? { parentBlockId: block.parentBlockId } : {}),
      kind: block.kind as BlockContentKind,
      position: block.position,
      path: new BlockTreePath(block.path.split('.').map((segment) => Number.parseInt(segment, 10))),
      content: block.content,
      metadata: block.metadata ?? {},
    }),
  );
}

@Injectable()
export class CreateContentDocumentUseCase {
  constructor(
    @Inject(ContentDocumentRepository) private readonly repo: ContentDocumentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(ContentEventPublisherService)
    private readonly eventPublisher: ContentEventPublisherService,
  ) {}

  async execute(context: RequestContext, input: CreateContentDocumentInput): Promise<ContentDocumentResponse> {
    const workspace = requireContentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CONTENT_DOCUMENT_CREATE, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const documentId = randomUUID();
      const versionId = randomUUID();
      const version = ContentVersion.createDraft({
        id: versionId,
        documentId,
        versionNumber: 1,
        blocks: mapBlocks(documentId, input.blocks),
        createdByPrincipalId: workspace.actorId,
      });

      const document = ContentDocument.createDraft({
        id: documentId,
        tenantId: workspace.tenantId,
        workspaceId: workspace.workspaceId,
        ownerPrincipalId: workspace.actorId,
        purpose: input.purpose as ContentDocumentPurpose,
        title: input.title,
        currentDraftVersion: version,
      });

      const saved = await this.repo.save(document, tx);

      await this.auditRecorder.record(
        {
          action: 'content.document.created',
          actorId: workspace.actorId,
          targetType: 'content.document',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        contentDocumentCreated({
          tenantId: saved.tenantId,
          workspaceId: saved.workspaceId,
          documentId: saved.id,
          ownerPrincipalId: saved.ownerPrincipalId,
          purpose: String(saved.purpose),
          title: saved.title,
        }),
        context,
        tx,
      );

      return mapContentDocumentToResponse(saved);
    });
  }
}
