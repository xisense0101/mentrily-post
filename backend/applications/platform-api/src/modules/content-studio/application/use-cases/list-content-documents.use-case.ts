import { Inject, Injectable } from '@nestjs/common';
import { AppError, PERMISSION_EVALUATOR, PermissionEvaluator, RequestContext } from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { ContentDocumentRepository } from '../../domain/repositories/index.js';
import { ContentDocumentPurpose } from '../../domain/value-objects/index.js';
import { mapContentDocumentToResponse } from '../mappers/index.js';
import { ContentDocumentResponse } from '../dto/index.js';
import { requireContentWorkspace } from '../support/index.js';

@Injectable()
export class ListContentDocumentsUseCase {
  constructor(
    @Inject(ContentDocumentRepository) private readonly repo: ContentDocumentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext, purpose?: string): Promise<ContentDocumentResponse[]> {
    const workspace = requireContentWorkspace(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CONTENT_DOCUMENT_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const documents = purpose
      ? await this.repo.listByPurpose(workspace.workspaceId, purpose as ContentDocumentPurpose)
      : await this.repo.listByWorkspace(workspace.workspaceId);

    return documents
      .filter((document) => document.tenantId === workspace.tenantId)
      .map(mapContentDocumentToResponse);
  }
}
