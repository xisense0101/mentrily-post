import type { Prisma } from '@prisma/client';
import type { MediaAsset, MediaUploadIntent } from '../../../domain/entities/index.js';
import {
  MediaAsset as MediaAssetEntity,
  MediaUploadIntent as MediaUploadIntentEntity,
} from '../../../domain/entities/index.js';

type PersistenceMediaAsset = {
  id: string;
  tenantId: string;
  workspaceId: string;
  ownerPrincipalId: string;
  filename: string;
  contentType: string;
  fileCategory: string;
  sizeBytes: bigint | null;
  checksumSha256: string | null;
  storageProvider: string;
  objectKey: string;
  visibility: string;
  status: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

type PersistenceMediaUploadIntent = {
  id: string;
  tenantId: string;
  workspaceId: string;
  assetId: string;
  ownerPrincipalId: string;
  objectKey: string;
  contentType: string;
  filename: string;
  fileCategory: string;
  maxSizeBytes: bigint;
  status: string;
  uploadUrl: string;
  uploadMethod: string;
  headers: unknown;
  expiresAt: Date;
  createdAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  failedAt: Date | null;
  metadata: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function toDomainMediaAsset(record: PersistenceMediaAsset): MediaAsset {
  return new MediaAssetEntity({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    ownerPrincipalId: record.ownerPrincipalId,
    filename: record.filename,
    contentType: record.contentType,
    fileCategory: record.fileCategory as MediaAsset['fileCategory'],
    ...(record.sizeBytes !== null ? { sizeBytes: Number(record.sizeBytes) } : {}),
    ...(record.checksumSha256 ? { checksumSha256: record.checksumSha256 } : {}),
    storageProvider: record.storageProvider as MediaAsset['storageProvider'],
    objectKey: record.objectKey,
    visibility: record.visibility as MediaAsset['visibility'],
    status: record.status as MediaAsset['status'],
    metadata: asRecord(record.metadata),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.archivedAt ? { archivedAt: record.archivedAt } : {}),
  });
}

export function toDomainMediaUploadIntent(record: PersistenceMediaUploadIntent): MediaUploadIntent {
  return new MediaUploadIntentEntity({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    assetId: record.assetId,
    ownerPrincipalId: record.ownerPrincipalId,
    objectKey: record.objectKey,
    contentType: record.contentType,
    filename: record.filename,
    fileCategory: record.fileCategory as MediaUploadIntent['fileCategory'],
    maxSizeBytes: Number(record.maxSizeBytes),
    status: record.status as MediaUploadIntent['status'],
    uploadUrl: record.uploadUrl,
    uploadMethod: record.uploadMethod as 'PUT',
    headers: Object.fromEntries(
      Object.entries(asRecord(record.headers)).map(([key, value]) => [key, String(value)]),
    ),
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    ...(record.completedAt ? { completedAt: record.completedAt } : {}),
    ...(record.cancelledAt ? { cancelledAt: record.cancelledAt } : {}),
    ...(record.failedAt ? { failedAt: record.failedAt } : {}),
    metadata: asRecord(record.metadata),
  });
}

export function toPersistenceMediaAssetCreate(asset: MediaAsset) {
  return {
    id: asset.id,
    tenantId: asset.tenantId,
    workspaceId: asset.workspaceId,
    ownerPrincipalId: asset.ownerPrincipalId,
    filename: asset.filename,
    contentType: asset.contentType,
    fileCategory: asset.fileCategory,
    sizeBytes: asset.sizeBytes ?? null,
    checksumSha256: asset.checksumSha256 ?? null,
    storageProvider: asset.storageProvider,
    objectKey: asset.objectKey,
    visibility: asset.visibility,
    status: asset.status,
    metadata: toInputJsonValue(asset.metadata),
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    archivedAt: asset.archivedAt ?? null,
  };
}

export function toPersistenceMediaAssetUpdate(asset: MediaAsset) {
  return {
    tenantId: asset.tenantId,
    workspaceId: asset.workspaceId,
    ownerPrincipalId: asset.ownerPrincipalId,
    filename: asset.filename,
    contentType: asset.contentType,
    fileCategory: asset.fileCategory,
    sizeBytes: asset.sizeBytes ?? null,
    checksumSha256: asset.checksumSha256 ?? null,
    storageProvider: asset.storageProvider,
    objectKey: asset.objectKey,
    visibility: asset.visibility,
    status: asset.status,
    metadata: toInputJsonValue(asset.metadata),
    updatedAt: asset.updatedAt,
    archivedAt: asset.archivedAt ?? null,
  };
}

export function toPersistenceMediaUploadIntentCreate(intent: MediaUploadIntent) {
  return {
    id: intent.id,
    tenantId: intent.tenantId,
    workspaceId: intent.workspaceId,
    assetId: intent.assetId,
    ownerPrincipalId: intent.ownerPrincipalId,
    objectKey: intent.objectKey,
    contentType: intent.contentType,
    filename: intent.filename,
    fileCategory: intent.fileCategory,
    maxSizeBytes: intent.maxSizeBytes,
    status: intent.status,
    uploadUrl: intent.uploadUrl,
    uploadMethod: intent.uploadMethod,
    headers: toInputJsonValue(intent.headers),
    expiresAt: intent.expiresAt,
    createdAt: intent.createdAt,
    completedAt: intent.completedAt ?? null,
    cancelledAt: intent.cancelledAt ?? null,
    failedAt: intent.failedAt ?? null,
    metadata: toInputJsonValue(intent.metadata),
  };
}

export function toPersistenceMediaUploadIntentUpdate(intent: MediaUploadIntent) {
  return {
    tenantId: intent.tenantId,
    workspaceId: intent.workspaceId,
    assetId: intent.assetId,
    ownerPrincipalId: intent.ownerPrincipalId,
    objectKey: intent.objectKey,
    contentType: intent.contentType,
    filename: intent.filename,
    fileCategory: intent.fileCategory,
    maxSizeBytes: intent.maxSizeBytes,
    status: intent.status,
    uploadUrl: intent.uploadUrl,
    uploadMethod: intent.uploadMethod,
    headers: toInputJsonValue(intent.headers),
    expiresAt: intent.expiresAt,
    completedAt: intent.completedAt ?? null,
    cancelledAt: intent.cancelledAt ?? null,
    failedAt: intent.failedAt ?? null,
    metadata: toInputJsonValue(intent.metadata),
  };
}
