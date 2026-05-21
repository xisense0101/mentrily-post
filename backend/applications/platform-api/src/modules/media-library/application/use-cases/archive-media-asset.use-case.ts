import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  AUDIT_RECORDER,
  type AuditRecorder,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  RequestContext,
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { mediaAssetArchived } from '../../domain/events/index.js';
import { MediaAssetRepository } from '../../domain/repositories/index.js';
import { mapMediaAssetToResponse } from '../mappers/index.js';
import type { MediaAssetResponse } from '../dto/index.js';
import { ensureMediaAssetOwnership, requireMediaActor } from '../support/index.js';
import { MediaEventPublisherService } from '../services/index.js';

@Injectable()
export class ArchiveMediaAssetUseCase {
  constructor(
    @Inject(MediaAssetRepository) private readonly assetRepository: MediaAssetRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(MediaEventPublisherService) private readonly eventPublisher: MediaEventPublisherService,
  ) {}

  async execute(context: RequestContext, assetId: string): Promise<MediaAssetResponse> {
    const workspace = requireMediaActor(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.MEDIA_ASSET_ARCHIVE, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const asset = await this.assetRepository.findById(assetId, tx);
      if (!asset) {
        throw new AppError('NOT_FOUND', 'media asset not found', 404);
      }
      ensureMediaAssetOwnership(asset, context);
      const archived = await this.assetRepository.save(asset.archive(), tx);

      await this.auditRecorder.record(
        {
          action: 'media.asset.archived',
          actorId: workspace.actorId,
          targetType: 'media.asset',
          targetId: archived.id,
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        mediaAssetArchived({
          tenantId: archived.tenantId,
          workspaceId: archived.workspaceId,
          assetId: archived.id,
          objectKey: archived.objectKey,
          contentType: archived.contentType,
          fileCategory: archived.fileCategory,
        }),
        context,
        tx,
      );

      return mapMediaAssetToResponse(archived);
    });
  }
}
