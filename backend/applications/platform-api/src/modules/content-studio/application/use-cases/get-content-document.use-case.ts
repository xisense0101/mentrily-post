import { Inject, Injectable } from '@nestjs/common';
import { AppError, PERMISSION_EVALUATOR, PermissionEvaluator, RequestContext } from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { ContentDocumentRepository } from '../../domain/repositories/index.js';
import { ContentDocumentResponse } from '../dto/index.js';
import { mapContentDocumentToResponse } from '../mappers/index.js';
import { ensureDocumentOwnership, requireContentWorkspace } from '../support/index.js';

@Injectable()
export class GetContentDocumentUseCase {
  constructor(
    @Inject(ContentDocumentRepository) private readonly repo: ContentDocumentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext, documentId: string): Promise<ContentDocumentResponse> {
    const workspace = requireContentWorkspace(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CONTENT_DOCUMENT_READ, workspace },
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
    return mapContentDocumentToResponse(document);
  }
}
