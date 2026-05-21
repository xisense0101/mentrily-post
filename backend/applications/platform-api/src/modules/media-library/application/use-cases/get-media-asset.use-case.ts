import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { MediaAssetRepository } from '../../domain/repositories/index.js';
import { MediaAccessPolicyService } from '../../domain/services/index.js';
import { mapMediaAssetToResponse } from '../mappers/index.js';
import type { MediaAssetResponse } from '../dto/index.js';
import { ensureMediaAssetOwnership, requireMediaWorkspace } from '../support/index.js';

@Injectable()
export class GetMediaAssetUseCase {
  constructor(
    @Inject(MediaAssetRepository) private readonly assetRepository: MediaAssetRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(MediaAccessPolicyService) private readonly accessPolicy: MediaAccessPolicyService,
  ) {}

  async execute(context: RequestContext, assetId: string): Promise<MediaAssetResponse> {
    const workspace = requireMediaWorkspace(context);
    const asset = await this.assetRepository.findById(assetId);
    if (!asset) {
      throw new AppError('NOT_FOUND', 'media asset not found', 404);
    }
    ensureMediaAssetOwnership(asset, context);

    const workspaceRead = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.MEDIA_ASSET_READ, workspace },
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

    return mapMediaAssetToResponse(asset);
  }
}
