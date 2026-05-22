import type { MediaAsset } from '../../domain/entities/index.js';
import type { MediaAssetResponse } from '../dto/index.js';

export function mapMediaAssetToResponse(asset: MediaAsset): MediaAssetResponse {
  return {
    id: asset.id,
    ownerPrincipalId: asset.ownerPrincipalId,
    filename: asset.filename,
    contentType: asset.contentType,
    fileCategory: asset.fileCategory,
    ...(asset.sizeBytes !== undefined ? { sizeBytes: asset.sizeBytes } : {}),
    ...(asset.checksumSha256 ? { checksumSha256: asset.checksumSha256 } : {}),
    storageProvider: asset.storageProvider,
    visibility: asset.visibility,
    status: asset.status,
    metadata: { ...asset.metadata },
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
    ...(asset.archivedAt ? { archivedAt: asset.archivedAt.toISOString() } : {}),
    scanStatus: asset.scanStatus,
    ...(asset.scannedAt ? { scannedAt: asset.scannedAt.toISOString() } : {}),
    quarantine: {
      isQuarantined: asset.scanStatus === 'QUARANTINED',
      ...(asset.quarantinedAt ? { quarantinedAt: asset.quarantinedAt.toISOString() } : {}),
      ...(asset.quarantineReason ? { quarantineReason: asset.quarantineReason } : {}),
    },
  };
}
