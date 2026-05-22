import type { Prisma } from '@prisma/client';
import type { MediaAsset, MediaUploadIntent } from '../../../domain/entities/index.js';
import {
  MediaAsset as MediaAssetEntity,
  MediaUploadIntent as MediaUploadIntentEntity,
  MediaProcessingJob as MediaProcessingJobEntity,
  MediaRendition as MediaRenditionEntity,
  MediaSecurityScanJob as MediaSecurityScanJobEntity,
  MediaLifecycleJob as MediaLifecycleJobEntity,
} from '../../../domain/entities/index.js';
import type {
  MediaProcessingJob,
  MediaRendition,
  MediaSecurityScanJob,
  MediaLifecycleJob,
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
  scanStatus: string;
  scannedAt: Date | null;
  scanErrorCode: string | null;
  scanErrorMessage: string | null;
  quarantineReason: string | null;
  quarantinedAt: Date | null;
  deleteAfter: Date | null;
  deletedAt: Date | null;
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

type PersistenceMediaProcessingJob = {
  id: string;
  workspaceId: string;
  mediaAssetId: string;
  jobType: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  idempotencyKey: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PersistenceMediaRendition = {
  id: string;
  workspaceId: string;
  mediaAssetId: string;
  kind: string;
  mimeType: string;
  sizeBytes: bigint;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  storageKey: string;
  createdAt: Date;
  updatedAt: Date;
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
    scanStatus: record.scanStatus as MediaAsset['scanStatus'],
    ...(record.scannedAt ? { scannedAt: record.scannedAt } : {}),
    ...(record.scanErrorCode ? { scanErrorCode: record.scanErrorCode } : {}),
    ...(record.scanErrorMessage ? { scanErrorMessage: record.scanErrorMessage } : {}),
    ...(record.quarantineReason ? { quarantineReason: record.quarantineReason } : {}),
    ...(record.quarantinedAt ? { quarantinedAt: record.quarantinedAt } : {}),
    ...(record.deleteAfter ? { deleteAfter: record.deleteAfter } : {}),
    ...(record.deletedAt ? { deletedAt: record.deletedAt } : {}),
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

export function toDomainMediaProcessingJob(record: PersistenceMediaProcessingJob): MediaProcessingJob {
  return new MediaProcessingJobEntity({
    id: record.id,
    workspaceId: record.workspaceId,
    mediaAssetId: record.mediaAssetId,
    jobType: record.jobType as MediaProcessingJob['jobType'],
    status: record.status as MediaProcessingJob['status'],
    attempts: record.attempts,
    maxAttempts: record.maxAttempts,
    runAfter: record.runAfter,
    ...(record.lockedAt ? { lockedAt: record.lockedAt } : {}),
    ...(record.lockedBy ? { lockedBy: record.lockedBy } : {}),
    idempotencyKey: record.idempotencyKey,
    ...(record.errorCode ? { errorCode: record.errorCode } : {}),
    ...(record.errorMessage ? { errorMessage: record.errorMessage } : {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDomainMediaRendition(record: PersistenceMediaRendition): MediaRendition {
  return new MediaRenditionEntity({
    id: record.id,
    workspaceId: record.workspaceId,
    mediaAssetId: record.mediaAssetId,
    kind: record.kind as MediaRendition['kind'],
    mimeType: record.mimeType,
    sizeBytes: Number(record.sizeBytes),
    ...(record.width !== null ? { width: record.width } : {}),
    ...(record.height !== null ? { height: record.height } : {}),
    ...(record.durationSeconds !== null ? { durationSeconds: record.durationSeconds } : {}),
    storageKey: record.storageKey,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
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
    scanStatus: asset.scanStatus,
    scannedAt: asset.scannedAt ?? null,
    scanErrorCode: asset.scanErrorCode ?? null,
    scanErrorMessage: asset.scanErrorMessage ?? null,
    quarantineReason: asset.quarantineReason ?? null,
    quarantinedAt: asset.quarantinedAt ?? null,
    deleteAfter: asset.deleteAfter ?? null,
    deletedAt: asset.deletedAt ?? null,
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
    scanStatus: asset.scanStatus,
    scannedAt: asset.scannedAt ?? null,
    scanErrorCode: asset.scanErrorCode ?? null,
    scanErrorMessage: asset.scanErrorMessage ?? null,
    quarantineReason: asset.quarantineReason ?? null,
    quarantinedAt: asset.quarantinedAt ?? null,
    deleteAfter: asset.deleteAfter ?? null,
    deletedAt: asset.deletedAt ?? null,
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

export function toPersistenceMediaProcessingJobCreate(job: MediaProcessingJob) {
  return {
    id: job.id,
    workspaceId: job.workspaceId,
    mediaAssetId: job.mediaAssetId,
    jobType: job.jobType,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAfter: job.runAfter,
    lockedAt: job.lockedAt ?? null,
    lockedBy: job.lockedBy ?? null,
    idempotencyKey: job.idempotencyKey,
    errorCode: job.errorCode ?? null,
    errorMessage: job.errorMessage ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function toPersistenceMediaProcessingJobUpdate(job: MediaProcessingJob) {
  return {
    workspaceId: job.workspaceId,
    mediaAssetId: job.mediaAssetId,
    jobType: job.jobType,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAfter: job.runAfter,
    lockedAt: job.lockedAt ?? null,
    lockedBy: job.lockedBy ?? null,
    idempotencyKey: job.idempotencyKey,
    errorCode: job.errorCode ?? null,
    errorMessage: job.errorMessage ?? null,
    updatedAt: job.updatedAt,
  };
}

export function toPersistenceMediaRenditionCreate(rendition: MediaRendition) {
  return {
    id: rendition.id,
    workspaceId: rendition.workspaceId,
    mediaAssetId: rendition.mediaAssetId,
    kind: rendition.kind,
    mimeType: rendition.mimeType,
    sizeBytes: rendition.sizeBytes,
    width: rendition.width ?? null,
    height: rendition.height ?? null,
    durationSeconds: rendition.durationSeconds ?? null,
    storageKey: rendition.storageKey,
    createdAt: rendition.createdAt,
    updatedAt: rendition.updatedAt,
  };
}

export type PersistenceMediaSecurityScanJob = {
  id: string;
  workspaceId: string;
  mediaAssetId: string;
  status: string;
  scannerProvider: string;
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  idempotencyKey: string;
  resultCode: string | null;
  resultMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PersistenceMediaLifecycleJob = {
  id: string;
  workspaceId: string;
  mediaAssetId: string | null;
  jobType: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  idempotencyKey: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toDomainMediaSecurityScanJob(record: PersistenceMediaSecurityScanJob): MediaSecurityScanJob {
  return new MediaSecurityScanJobEntity({
    id: record.id,
    workspaceId: record.workspaceId,
    mediaAssetId: record.mediaAssetId,
    status: record.status as MediaSecurityScanJob['status'],
    scannerProvider: record.scannerProvider as MediaSecurityScanJob['scannerProvider'],
    attempts: record.attempts,
    maxAttempts: record.maxAttempts,
    runAfter: record.runAfter,
    ...(record.lockedAt ? { lockedAt: record.lockedAt } : {}),
    ...(record.lockedBy ? { lockedBy: record.lockedBy } : {}),
    idempotencyKey: record.idempotencyKey,
    ...(record.resultCode ? { resultCode: record.resultCode } : {}),
    ...(record.resultMessage ? { resultMessage: record.resultMessage } : {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDomainMediaLifecycleJob(record: PersistenceMediaLifecycleJob): MediaLifecycleJob {
  return new MediaLifecycleJobEntity({
    id: record.id,
    workspaceId: record.workspaceId,
    ...(record.mediaAssetId ? { mediaAssetId: record.mediaAssetId } : {}),
    jobType: record.jobType as MediaLifecycleJob['jobType'],
    status: record.status as MediaLifecycleJob['status'],
    attempts: record.attempts,
    maxAttempts: record.maxAttempts,
    runAfter: record.runAfter,
    ...(record.lockedAt ? { lockedAt: record.lockedAt } : {}),
    ...(record.lockedBy ? { lockedBy: record.lockedBy } : {}),
    idempotencyKey: record.idempotencyKey,
    ...(record.errorCode ? { errorCode: record.errorCode } : {}),
    ...(record.errorMessage ? { errorMessage: record.errorMessage } : {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toPersistenceMediaSecurityScanJobCreate(job: MediaSecurityScanJob) {
  return {
    id: job.id,
    workspaceId: job.workspaceId,
    mediaAssetId: job.mediaAssetId,
    status: job.status,
    scannerProvider: job.scannerProvider,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAfter: job.runAfter,
    lockedAt: job.lockedAt ?? null,
    lockedBy: job.lockedBy ?? null,
    idempotencyKey: job.idempotencyKey,
    resultCode: job.resultCode ?? null,
    resultMessage: job.resultMessage ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function toPersistenceMediaSecurityScanJobUpdate(job: MediaSecurityScanJob) {
  return {
    workspaceId: job.workspaceId,
    mediaAssetId: job.mediaAssetId,
    status: job.status,
    scannerProvider: job.scannerProvider,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAfter: job.runAfter,
    lockedAt: job.lockedAt ?? null,
    lockedBy: job.lockedBy ?? null,
    idempotencyKey: job.idempotencyKey,
    resultCode: job.resultCode ?? null,
    resultMessage: job.resultMessage ?? null,
    updatedAt: job.updatedAt,
  };
}

export function toPersistenceMediaLifecycleJobCreate(job: MediaLifecycleJob) {
  return {
    id: job.id,
    workspaceId: job.workspaceId,
    mediaAssetId: job.mediaAssetId ?? null,
    jobType: job.jobType,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAfter: job.runAfter,
    lockedAt: job.lockedAt ?? null,
    lockedBy: job.lockedBy ?? null,
    idempotencyKey: job.idempotencyKey,
    errorCode: job.errorCode ?? null,
    errorMessage: job.errorMessage ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function toPersistenceMediaLifecycleJobUpdate(job: MediaLifecycleJob) {
  return {
    workspaceId: job.workspaceId,
    mediaAssetId: job.mediaAssetId ?? null,
    jobType: job.jobType,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAfter: job.runAfter,
    lockedAt: job.lockedAt ?? null,
    lockedBy: job.lockedBy ?? null,
    idempotencyKey: job.idempotencyKey,
    errorCode: job.errorCode ?? null,
    errorMessage: job.errorMessage ?? null,
    updatedAt: job.updatedAt,
  };
}

