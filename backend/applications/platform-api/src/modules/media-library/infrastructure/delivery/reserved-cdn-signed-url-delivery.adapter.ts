import { Inject, Injectable } from '@nestjs/common';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import type { MediaDeliveryUrlSignerPort, SignedUrlResult } from '../../application/ports/media-delivery-url-signer.port.js';
import { PrivateSignedUrlDeliveryAdapter } from './private-signed-url-delivery.adapter.js';

@Injectable()
export class ReservedCdnSignedUrlDeliveryAdapter implements MediaDeliveryUrlSignerPort {
  constructor(
    private readonly privateUrlSigner: PrivateSignedUrlDeliveryAdapter,
  ) {}

  async signReadUrl(asset: MediaAsset, options?: { ttlSeconds?: number }): Promise<SignedUrlResult> {
    const isCdnEnabled = process.env.MEDIA_DELIVERY_CDN_ENABLED === 'true';
    if (!isCdnEnabled) {
      return this.privateUrlSigner.signReadUrl(asset, options);
    }

    const ttl = options?.ttlSeconds ?? 1800;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const cdnDomain = process.env.MEDIA_DELIVERY_CDN_DOMAIN || 'cdn.mentrily.local';
    
    const safePath = `assets/${asset.id}`;
    const url = `https://${cdnDomain}/${safePath}?token=cdn_reserved_${asset.id}_expires_${expiresAt.getTime()}`;

    return {
      url,
      method: 'GET',
      headers: {},
      expiresAt,
    };
  }
}
