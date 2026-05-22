import { AppError } from '@mentrily/service-core';
import type {
  MediaAssetStatus,
  MediaAssetVisibility,
  MediaFileCategory,
  MediaStorageProvider,
  MediaScanStatus,
} from '../value-objects/index.js';
import { assertMediaContentType, assertMediaObjectKey } from '../value-objects/index.js';

export interface MediaAssetProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  ownerPrincipalId: string;
  filename: string;
  contentType: string;
  fileCategory: MediaFileCategory;
  sizeBytes?: number | undefined;
  checksumSha256?: string | undefined;
  storageProvider: MediaStorageProvider;
  objectKey: string;
  visibility: MediaAssetVisibility;
  status: MediaAssetStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | undefined;
  scanStatus?: MediaScanStatus | undefined;
  scannedAt?: Date | undefined;
  scanErrorCode?: string | undefined;
  scanErrorMessage?: string | undefined;
  quarantineReason?: string | undefined;
  quarantinedAt?: Date | undefined;
  deleteAfter?: Date | undefined;
  deletedAt?: Date | undefined;
}

function required(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError('VALIDATION_ERROR', `${field} is required`, 400);
  }

  return trimmed;
}

export class MediaAsset {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly ownerPrincipalId: string;
  readonly filename: string;
  readonly contentType: string;
  readonly fileCategory: MediaFileCategory;
  readonly sizeBytes?: number | undefined;
  readonly checksumSha256?: string | undefined;
  readonly storageProvider: MediaStorageProvider;
  readonly objectKey: string;
  readonly visibility: MediaAssetVisibility;
  readonly status: MediaAssetStatus;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt?: Date | undefined;

  readonly scanStatus: MediaScanStatus;
  readonly scannedAt?: Date | undefined;
  readonly scanErrorCode?: string | undefined;
  readonly scanErrorMessage?: string | undefined;
  readonly quarantineReason?: string | undefined;
  readonly quarantinedAt?: Date | undefined;
  readonly deleteAfter?: Date | undefined;
  readonly deletedAt?: Date | undefined;

  constructor(props: MediaAssetProps) {
    this.id = required(props.id, 'id');
    this.tenantId = required(props.tenantId, 'tenantId');
    this.workspaceId = required(props.workspaceId, 'workspaceId');
    this.ownerPrincipalId = required(props.ownerPrincipalId, 'ownerPrincipalId');
    this.filename = required(props.filename, 'filename');
    this.contentType = assertMediaContentType(props.contentType);
    this.fileCategory = props.fileCategory;
    this.sizeBytes = props.sizeBytes;
    this.checksumSha256 = props.checksumSha256;
    this.storageProvider = props.storageProvider;
    this.objectKey = assertMediaObjectKey(props.objectKey, this.tenantId, this.workspaceId);
    this.visibility = props.visibility;
    this.status = props.status;
    this.metadata = { ...props.metadata };
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.archivedAt = props.archivedAt;

    this.scanStatus = props.scanStatus ?? 'UNSCANNED';
    this.scannedAt = props.scannedAt;
    this.scanErrorCode = props.scanErrorCode;
    this.scanErrorMessage = props.scanErrorMessage;
    this.quarantineReason = props.quarantineReason;
    this.quarantinedAt = props.quarantinedAt;
    this.deleteAfter = props.deleteAfter;
    this.deletedAt = props.deletedAt;
  }

  static createPending(
    input: Omit<
      MediaAssetProps,
      'status' | 'visibility' | 'createdAt' | 'updatedAt' | 'metadata'
    > & {
      visibility?: MediaAssetVisibility | undefined;
      metadata?: Record<string, unknown> | undefined;
      createdAt?: Date | undefined;
      updatedAt?: Date | undefined;
    },
  ): MediaAsset {
    const now = input.createdAt ?? new Date();
    return new MediaAsset({
      ...input,
      visibility: input.visibility ?? 'PRIVATE',
      status: 'PENDING_UPLOAD',
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  markUploaded(input: {
    sizeBytes?: number | undefined;
    checksumSha256?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    occurredAt?: Date | undefined;
  }): MediaAsset {
    if (this.status !== 'PENDING_UPLOAD') {
      throw new AppError('CONFLICT', 'only pending assets can be marked uploaded', 409);
    }

    return new MediaAsset({
      ...this,
      status: 'UPLOADED',
      sizeBytes: input.sizeBytes ?? this.sizeBytes,
      checksumSha256: input.checksumSha256 ?? this.checksumSha256,
      metadata: input.metadata ? { ...this.metadata, ...input.metadata } : this.metadata,
      updatedAt: input.occurredAt ?? new Date(),
    });
  }

  queueProcessing(occurredAt = new Date()): MediaAsset {
    if (this.status !== 'UPLOADED') {
      throw new AppError('CONFLICT', 'only uploaded assets can be queued for processing', 409);
    }

    return new MediaAsset({
      ...this,
      status: 'PROCESSING_QUEUED',
      updatedAt: occurredAt,
    });
  }

  markProcessing(occurredAt = new Date()): MediaAsset {
    if (this.status !== 'PROCESSING_QUEUED' && this.status !== 'PROCESSING') {
      throw new AppError('CONFLICT', 'only queued assets can be marked as processing', 409);
    }

    return new MediaAsset({
      ...this,
      status: 'PROCESSING',
      updatedAt: occurredAt,
    });
  }

  markProcessingFailed(metadata?: Record<string, unknown>, occurredAt = new Date()): MediaAsset {
    if (this.status !== 'PROCESSING' && this.status !== 'PROCESSING_QUEUED') {
      throw new AppError('CONFLICT', 'only processing assets can fail processing', 409);
    }

    return new MediaAsset({
      ...this,
      status: 'PROCESSING_FAILED',
      metadata: metadata ? { ...this.metadata, ...metadata } : this.metadata,
      updatedAt: occurredAt,
    });
  }

  markAvailable(input?: {
    sizeBytes?: number | undefined;
    checksumSha256?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    occurredAt?: Date | undefined;
  }): MediaAsset {
    if (
      this.status !== 'PENDING_UPLOAD' &&
      this.status !== 'UPLOADED' &&
      this.status !== 'PROCESSING'
    ) {
      throw new AppError('CONFLICT', 'media asset cannot be marked available', 409);
    }

    return new MediaAsset({
      ...this,
      status: 'AVAILABLE',
      sizeBytes: input?.sizeBytes ?? this.sizeBytes,
      checksumSha256: input?.checksumSha256 ?? this.checksumSha256,
      metadata: input?.metadata ? { ...this.metadata, ...input.metadata } : this.metadata,
      updatedAt: input?.occurredAt ?? new Date(),
    });
  }

  markFailed(metadata?: Record<string, unknown>, occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      status: 'FAILED',
      metadata: metadata ? { ...this.metadata, ...metadata } : this.metadata,
      updatedAt: occurredAt,
    });
  }

  archive(occurredAt = new Date()): MediaAsset {
    if (this.status !== 'AVAILABLE') {
      throw new AppError('CONFLICT', 'media asset cannot be archived', 409);
    }

    return new MediaAsset({
      ...this,
      status: 'ARCHIVED',
      archivedAt: occurredAt,
      updatedAt: occurredAt,
    });
  }

  updateMetadata(metadata: Record<string, unknown>, occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      metadata: { ...this.metadata, ...metadata },
      updatedAt: occurredAt,
    });
  }

  canBeReadBy(input: {
    tenantId: string;
    workspaceId: string;
    actorId?: string | undefined;
  }): boolean {
    if (this.status !== 'AVAILABLE') {
      return false;
    }

    if (
      this.scanStatus === 'INFECTED' ||
      this.scanStatus === 'QUARANTINED'
    ) {
      return false;
    }

    if (this.tenantId !== input.tenantId || this.workspaceId !== input.workspaceId) {
      return false;
    }

    if (this.visibility === 'WORKSPACE') {
      return true;
    }

    return this.ownerPrincipalId === input.actorId;
  }

  queueScan(occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      scanStatus: 'SCAN_QUEUED',
      updatedAt: occurredAt,
    });
  }

  startScanning(occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      scanStatus: 'SCANNING',
      updatedAt: occurredAt,
    });
  }

  markClean(occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      scanStatus: 'CLEAN',
      scannedAt: occurredAt,
      scanErrorCode: undefined,
      scanErrorMessage: undefined,
      updatedAt: occurredAt,
    });
  }

  markSuspicious(occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      scanStatus: 'SUSPICIOUS',
      scannedAt: occurredAt,
      updatedAt: occurredAt,
    });
  }

  markInfected(occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      scanStatus: 'INFECTED',
      scannedAt: occurredAt,
      updatedAt: occurredAt,
    });
  }

  quarantine(reason: string, occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      scanStatus: 'QUARANTINED',
      quarantineReason: reason,
      quarantinedAt: occurredAt,
      updatedAt: occurredAt,
    });
  }

  markScanFailed(errorCode: string, errorMessage: string, occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      scanStatus: 'SCAN_FAILED',
      scannedAt: occurredAt,
      scanErrorCode: errorCode,
      scanErrorMessage: errorMessage,
      updatedAt: occurredAt,
    });
  }

  abandon(occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      status: 'ABANDONED',
      updatedAt: occurredAt,
    });
  }

  queueDelete(occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      status: 'DELETE_QUEUED',
      updatedAt: occurredAt,
    });
  }

  markDeleted(occurredAt = new Date()): MediaAsset {
    return new MediaAsset({
      ...this,
      status: 'DELETED',
      deletedAt: occurredAt,
      updatedAt: occurredAt,
    });
  }
}
