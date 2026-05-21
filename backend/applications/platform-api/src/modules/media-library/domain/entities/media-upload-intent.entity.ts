import { AppError } from '@mentrily/service-core';
import type { MediaFileCategory, MediaUploadIntentStatus } from '../value-objects/index.js';
import { assertMediaContentType, assertMediaObjectKey } from '../value-objects/index.js';

export interface MediaUploadIntentProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  assetId: string;
  ownerPrincipalId: string;
  objectKey: string;
  contentType: string;
  filename: string;
  fileCategory: MediaFileCategory;
  maxSizeBytes: number;
  status: MediaUploadIntentStatus;
  uploadUrl: string;
  uploadMethod: 'PUT';
  headers: Record<string, string>;
  expiresAt: Date;
  createdAt: Date;
  completedAt?: Date | undefined;
  cancelledAt?: Date | undefined;
  failedAt?: Date | undefined;
  metadata: Record<string, unknown>;
}

function requireValue(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError('VALIDATION_ERROR', `${field} is required`, 400);
  }

  return trimmed;
}

export class MediaUploadIntent {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly assetId: string;
  readonly ownerPrincipalId: string;
  readonly objectKey: string;
  readonly contentType: string;
  readonly filename: string;
  readonly fileCategory: MediaFileCategory;
  readonly maxSizeBytes: number;
  readonly status: MediaUploadIntentStatus;
  readonly uploadUrl: string;
  readonly uploadMethod: 'PUT';
  readonly headers: Record<string, string>;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly completedAt?: Date | undefined;
  readonly cancelledAt?: Date | undefined;
  readonly failedAt?: Date | undefined;
  readonly metadata: Record<string, unknown>;

  constructor(props: MediaUploadIntentProps) {
    this.id = requireValue(props.id, 'id');
    this.tenantId = requireValue(props.tenantId, 'tenantId');
    this.workspaceId = requireValue(props.workspaceId, 'workspaceId');
    this.assetId = requireValue(props.assetId, 'assetId');
    this.ownerPrincipalId = requireValue(props.ownerPrincipalId, 'ownerPrincipalId');
    this.objectKey = assertMediaObjectKey(props.objectKey, this.tenantId, this.workspaceId);
    this.contentType = assertMediaContentType(props.contentType);
    this.filename = requireValue(props.filename, 'filename');
    this.fileCategory = props.fileCategory;
    this.maxSizeBytes = props.maxSizeBytes;
    this.status = props.status;
    this.uploadUrl = requireValue(props.uploadUrl, 'uploadUrl');
    this.uploadMethod = props.uploadMethod;
    this.headers = { ...props.headers };
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
    this.completedAt = props.completedAt;
    this.cancelledAt = props.cancelledAt;
    this.failedAt = props.failedAt;
    this.metadata = { ...props.metadata };
  }

  static create(
    input: Omit<MediaUploadIntentProps, 'status' | 'createdAt' | 'metadata'> & {
      createdAt?: Date | undefined;
      metadata?: Record<string, unknown> | undefined;
    },
  ): MediaUploadIntent {
    return new MediaUploadIntent({
      ...input,
      status: 'PENDING',
      createdAt: input.createdAt ?? new Date(),
      metadata: input.metadata ?? {},
    });
  }

  isExpired(now: Date): boolean {
    return this.expiresAt.getTime() <= now.getTime() || this.status === 'EXPIRED';
  }

  complete(occurredAt = new Date()): MediaUploadIntent {
    if (this.status !== 'PENDING' || this.isExpired(occurredAt)) {
      throw new AppError('CONFLICT', 'media upload intent cannot be completed', 409);
    }

    return new MediaUploadIntent({
      ...this,
      status: 'COMPLETED',
      completedAt: occurredAt,
    });
  }

  expire(_occurredAt = new Date()): MediaUploadIntent {
    return new MediaUploadIntent({
      ...this,
      status: 'EXPIRED',
      metadata: this.metadata,
      failedAt: this.failedAt,
      cancelledAt: this.cancelledAt,
      completedAt: this.completedAt,
    });
  }

  cancel(occurredAt = new Date()): MediaUploadIntent {
    if (this.status !== 'PENDING') {
      throw new AppError('CONFLICT', 'media upload intent cannot be cancelled', 409);
    }

    return new MediaUploadIntent({
      ...this,
      status: 'CANCELLED',
      cancelledAt: occurredAt,
    });
  }

  fail(metadata?: Record<string, unknown>, occurredAt = new Date()): MediaUploadIntent {
    return new MediaUploadIntent({
      ...this,
      status: 'FAILED',
      failedAt: occurredAt,
      metadata: metadata ? { ...this.metadata, ...metadata } : this.metadata,
    });
  }
}
