import { AppError } from '@mentrily/service-core';

export type MediaLifecycleJobType =
  | 'EXPIRE_UPLOAD'
  | 'DELETE_ASSET'
  | 'DELETE_RENDITION'
  | 'CLEAN_FAILED'
  | 'CLEAN_ORPHANED';

export type MediaLifecycleJobStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD';

export interface MediaLifecycleJobProps {
  id: string;
  workspaceId: string;
  mediaAssetId?: string | undefined;
  jobType: MediaLifecycleJobType;
  status: MediaLifecycleJobStatus;
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lockedAt?: Date | undefined;
  lockedBy?: string | undefined;
  idempotencyKey: string;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

function required(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError('VALIDATION_ERROR', `${field} is required`, 400);
  }
  return trimmed;
}

export class MediaLifecycleJob {
  readonly id: string;
  readonly workspaceId: string;
  readonly mediaAssetId?: string | undefined;
  readonly jobType: MediaLifecycleJobType;
  readonly status: MediaLifecycleJobStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly runAfter: Date;
  readonly lockedAt?: Date | undefined;
  readonly lockedBy?: string | undefined;
  readonly idempotencyKey: string;
  readonly errorCode?: string | undefined;
  readonly errorMessage?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: MediaLifecycleJobProps) {
    this.id = required(props.id, 'id');
    this.workspaceId = required(props.workspaceId, 'workspaceId');
    this.mediaAssetId = props.mediaAssetId;
    this.jobType = props.jobType;
    this.status = props.status;
    this.attempts = props.attempts;
    this.maxAttempts = props.maxAttempts;
    this.runAfter = props.runAfter;
    this.lockedAt = props.lockedAt;
    this.lockedBy = props.lockedBy;
    this.idempotencyKey = required(props.idempotencyKey, 'idempotencyKey');
    this.errorCode = props.errorCode;
    this.errorMessage = props.errorMessage;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static enqueue(
    input: Pick<MediaLifecycleJobProps, 'id' | 'workspaceId' | 'mediaAssetId' | 'jobType' | 'idempotencyKey'>,
  ): MediaLifecycleJob {
    const now = new Date();
    return new MediaLifecycleJob({
      ...input,
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      runAfter: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  claim(workerId: string, occurredAt = new Date()): MediaLifecycleJob {
    if (this.status !== 'QUEUED' && this.status !== 'RETRYING') {
      throw new AppError('CONFLICT', 'job cannot be claimed', 409);
    }

    return new MediaLifecycleJob({
      ...this,
      status: 'PROCESSING',
      attempts: this.attempts + 1,
      lockedAt: occurredAt,
      lockedBy: workerId,
      updatedAt: occurredAt,
    });
  }

  succeed(occurredAt = new Date()): MediaLifecycleJob {
    if (this.status !== 'PROCESSING') {
      throw new AppError('CONFLICT', 'only processing jobs can succeed', 409);
    }

    return new MediaLifecycleJob({
      ...this,
      status: 'SUCCEEDED',
      lockedAt: undefined,
      lockedBy: undefined,
      updatedAt: occurredAt,
    });
  }

  fail(
    error: { code: string; message: string },
    occurredAt = new Date(),
  ): MediaLifecycleJob {
    if (this.status !== 'PROCESSING') {
      throw new AppError('CONFLICT', 'only processing jobs can fail', 409);
    }

    const isTerminal = this.attempts >= this.maxAttempts;

    return new MediaLifecycleJob({
      ...this,
      status: isTerminal ? 'DEAD' : 'FAILED',
      errorCode: error.code,
      errorMessage: error.message,
      lockedAt: undefined,
      lockedBy: undefined,
      updatedAt: occurredAt,
    });
  }

  scheduleRetry(runAfter: Date, occurredAt = new Date()): MediaLifecycleJob {
    if (this.status !== 'FAILED') {
      throw new AppError('CONFLICT', 'only failed jobs can be retried', 409);
    }

    return new MediaLifecycleJob({
      ...this,
      status: 'RETRYING',
      runAfter,
      errorCode: undefined,
      errorMessage: undefined,
      updatedAt: occurredAt,
    });
  }
}
