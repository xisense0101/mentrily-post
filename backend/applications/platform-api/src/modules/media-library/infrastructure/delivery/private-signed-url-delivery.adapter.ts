import { Inject, Injectable } from '@nestjs/common';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from '../storage/index.js';
import type { MediaDeliveryUrlSignerPort, SignedUrlResult } from '../../application/ports/media-delivery-url-signer.port.js';

@Injectable()
export class PrivateSignedUrlDeliveryAdapter implements MediaDeliveryUrlSignerPort {
  constructor(
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: ObjectStoragePort,
  ) {}

  async signReadUrl(asset: MediaAsset, options?: { ttlSeconds?: number }): Promise<SignedUrlResult> {
    const ttl = options?.ttlSeconds ?? 300; // 5 minutes default
    const expiresAt = new Date(Date.now() + ttl * 1000);

    const result = await this.objectStorage.createReadUrl({
      provider: asset.storageProvider,
      objectKey: asset.objectKey,
      filename: asset.filename,
      expiresAt,
    });

    return {
      url: result.url,
      method: result.method,
      headers: result.headers,
      expiresAt: result.expiresAt,
    };
  }
}
