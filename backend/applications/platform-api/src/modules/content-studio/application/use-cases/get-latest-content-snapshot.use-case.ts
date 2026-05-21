import { Inject, Injectable } from '@nestjs/common';
import { AppError, PERMISSION_EVALUATOR, PermissionEvaluator, RequestContext } from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { ContentDocumentRepository, ContentSnapshotRepository } from '../../domain/repositories/index.js';
import { ContentPublishedSnapshotResponse } from '../dto/index.js';
import { mapContentSnapshotToResponse } from '../mappers/index.js';
import { ensureDocumentOwnership, requireContentWorkspace } from '../support/index.js';

@Injectable()
export class GetLatestContentSnapshotUseCase {
  constructor(
    @Inject(ContentDocumentRepository) private readonly repo: ContentDocumentRepository,
    @Inject(ContentSnapshotRepository) private readonly snapshotRepo: ContentSnapshotRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext, documentId: string): Promise<ContentPublishedSnapshotResponse> {
    const workspace = requireContentWorkspace(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CONTENT_SNAPSHOT_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const document = await this.repo.findById(documentId);
    if (!document) {
      throw new AppError('NOT_FOUND', 'content document not found', 404);
    }

    ensureDocumentOwnership(document, context);
    const snapshot = await this.snapshotRepo.findLatestByDocumentId(documentId);
    if (!snapshot) {
      throw new AppError('NOT_FOUND', 'content snapshot not found', 404);
    }

    return mapContentSnapshotToResponse(snapshot);
  }
}
