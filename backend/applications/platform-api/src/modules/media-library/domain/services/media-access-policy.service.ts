import { Injectable } from '@nestjs/common';
import type { MediaAsset } from '../entities/index.js';

@Injectable()
export class MediaAccessPolicyService {
  canReadAsset(input: {
    asset: MediaAsset;
    tenantId: string;
    workspaceId: string;
    actorId?: string | undefined;
    hasWorkspaceReadPermission: boolean;
  }): boolean {
    const { asset, tenantId, workspaceId, actorId, hasWorkspaceReadPermission } = input;
    if (
      asset.tenantId !== tenantId ||
      asset.workspaceId !== workspaceId ||
      asset.status !== 'AVAILABLE' ||
      asset.scanStatus !== 'CLEAN'
    ) {
      return false;
    }

    if (asset.visibility === 'PRIVATE') {
      return asset.ownerPrincipalId === actorId;
    }

    return hasWorkspaceReadPermission;
  }
}
