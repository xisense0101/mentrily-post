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
import { mediaReadUrlCreated } from '../../domain/events/index.js';
import { MediaAssetRepository } from '../../domain/repositories/index.js';
import { MediaAccessPolicyService } from '../../domain/services/index.js';
import { mapMediaReadUrlToResponse } from '../mappers/index.js';
import type { MediaReadUrlResponse } from '../dto/index.js';
import { ensureMediaAssetOwnership, requireMediaWorkspace } from '../support/index.js';
import { MediaEventPublisherService } from '../services/index.js';
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from '../../infrastructure/storage/index.js';

@Injectable()
export class GetMediaReadUrlUseCase {
  constructor(
    @Inject(MediaAssetRepository) private readonly assetRepository: MediaAssetRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(MediaAccessPolicyService) private readonly accessPolicy: MediaAccessPolicyService,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: ObjectStoragePort,
    @Inject(MediaEventPublisherService) private readonly eventPublisher: MediaEventPublisherService,
  ) {}

  async execute(context: RequestContext, assetId: string): Promise<MediaReadUrlResponse> {
    const workspace = requireMediaWorkspace(context);
    const asset = await this.assetRepository.findById(assetId);
    if (!asset) {
      throw new AppError('NOT_FOUND', 'media asset not found', 404);
    }
    ensureMediaAssetOwnership(asset, context);

    if (asset.status !== 'AVAILABLE') {
      throw new AppError('CONFLICT', 'media asset cannot issue read url', 409);
    }

    const workspaceRead = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.MEDIA_READ_URL_CREATE, workspace },
      context,
    );
    const ownRead = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.MEDIA_ASSET_READ_OWN, workspace },
      context,
    );
    const allowed = this.accessPolicy.canReadAsset({
      asset,
      tenantId: workspace.tenantId,
      workspaceId: workspace.workspaceId,
      actorId: workspace.actorId,
      hasWorkspaceReadPermission: workspaceRead.allowed || ownRead.allowed,
    });
    if (!allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const result = await this.objectStorage.createReadUrl({
      provider: asset.storageProvider,
      objectKey: asset.objectKey,
      filename: asset.filename,
      expiresAt,
    });

    await this.transactionRunner.run(async (tx) => {
      await this.auditRecorder.record(
        {
          action: 'media.read_url.created',
          ...(workspace.actorId ? { actorId: workspace.actorId } : {}),
          targetType: 'media.asset',
          targetId: asset.id,
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        mediaReadUrlCreated({
          tenantId: asset.tenantId,
          workspaceId: asset.workspaceId,
          assetId: asset.id,
          objectKey: asset.objectKey,
          contentType: asset.contentType,
          fileCategory: asset.fileCategory,
        }),
        context,
        tx,
      );
    });

    return mapMediaReadUrlToResponse(result);
  }
}
