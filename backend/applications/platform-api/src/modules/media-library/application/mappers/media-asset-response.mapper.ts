import type { MediaAsset } from '../../domain/entities/index.js';
import type { MediaAssetResponse } from '../dto/index.js';
import type {
  MediaProcessingSummaryContract,
  MediaProcessingTemplateSummaryContract,
} from '@mentrily/contract-catalog';

function readProcessingTemplate(
  asset: MediaAsset,
): MediaProcessingTemplateSummaryContract | undefined {
  const value = asset.metadata.processingTemplate;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const template = value as Record<string, unknown>;
  if (
    typeof template.key !== 'string' ||
    typeof template.name !== 'string' ||
    typeof template.description !== 'string' ||
    typeof template.fileCategory !== 'string'
  ) {
    return undefined;
  }

  return {
    key: template.key as MediaProcessingTemplateSummaryContract['key'],
    name: template.name,
    description: template.description,
    fileCategory: template.fileCategory as MediaProcessingTemplateSummaryContract['fileCategory'],
  };
}

function readProcessingSummary(asset: MediaAsset): MediaProcessingSummaryContract | undefined {
  const value = asset.metadata.processingSummary;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as MediaProcessingSummaryContract;
}

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
    ...(readProcessingTemplate(asset) ? { processingTemplate: readProcessingTemplate(asset) } : {}),
    ...(readProcessingSummary(asset) ? { processingSummary: readProcessingSummary(asset) } : {}),
  };
}
