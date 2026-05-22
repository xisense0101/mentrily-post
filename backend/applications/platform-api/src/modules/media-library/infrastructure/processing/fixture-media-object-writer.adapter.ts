import { Injectable } from '@nestjs/common';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaObjectWriterPort } from '../../application/ports/media-object-writer.port.js';

@Injectable()
export class FixtureMediaObjectWriter implements MediaObjectWriterPort {
  async uploadFromTemp(
    asset: MediaAsset,
    _tempFilePath: string,
    _contentType: string,
    prefix: string,
  ): Promise<string> {
    return `tenants/${asset.tenantId}/workspaces/${asset.workspaceId}/media/${asset.id}/renditions/${prefix}`;
  }
}
