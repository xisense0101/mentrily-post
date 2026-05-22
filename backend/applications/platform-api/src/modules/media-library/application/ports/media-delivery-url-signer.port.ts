import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';

export interface SignedUrlResult {
  url: string;
  method: 'GET';
  headers: Record<string, string>;
  expiresAt: Date;
}

export const MEDIA_DELIVERY_URL_SIGNER = Symbol('MEDIA_DELIVERY_URL_SIGNER');

export interface MediaDeliveryUrlSignerPort {
  signReadUrl(asset: MediaAsset, options?: { ttlSeconds?: number }): Promise<SignedUrlResult>;
}
