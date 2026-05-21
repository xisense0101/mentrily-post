import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { MediaAssetRepository } from '../../domain/repositories/index.js';
import { mapMediaAssetToResponse } from '../mappers/index.js';
import type { MediaAssetResponse } from '../dto/index.js';
import { requireMediaWorkspace } from '../support/index.js';
import type { MediaAssetStatus, MediaFileCategory } from '../../domain/index.js';

@Injectable()
export class ListMediaAssetsUseCase {
  constructor(
    @Inject(MediaAssetRepository) private readonly assetRepository: MediaAssetRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    input?: {
      status?: MediaAssetStatus | undefined;
      fileCategory?: MediaFileCategory | undefined;
      ownerPrincipalId?: string | undefined;
    },
  ): Promise<MediaAssetResponse[]> {
    const workspace = requireMediaWorkspace(context);
    const workspacePerm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.MEDIA_ASSET_LIST, workspace },
      context,
    );
    const ownPerm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.MEDIA_ASSET_READ_OWN, workspace },
      context,
    );
    if (!workspacePerm.allowed && !ownPerm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const records = await this.assetRepository.listByWorkspace({
      workspaceId: workspace.workspaceId,
      ...(input?.status ? { status: input.status } : {}),
      ...(input?.fileCategory ? { fileCategory: input.fileCategory } : {}),
      ...(workspacePerm.allowed
        ? input?.ownerPrincipalId
          ? { ownerPrincipalId: input.ownerPrincipalId }
          : {}
        : workspace.actorId
          ? { ownerPrincipalId: workspace.actorId }
          : {}),
    });
    return records.map(mapMediaAssetToResponse);
  }
}
