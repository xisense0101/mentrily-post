import { AppError } from '@mentrily/service-core';

export type MediaSecurityScanJobStatus =
  | 'QUEUED'
  | 'SCANNING'
  | 'CLEAN'
  | 'INFECTED'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD';

export type MediaSecurityScannerProvider =
  | 'NOOP'
  | 'FIXTURE'
  | 'CLAMAV_RESERVED'
  | 'EXTERNAL_RESERVED';

export interface MediaSecurityScanJobProps {
  id: string;
  workspaceId: string;
  mediaAssetId: string;
  status: MediaSecurityScanJobStatus;
  scannerProvider: MediaSecurityScannerProvider;
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lockedAt?: Date | undefined;
  lockedBy?: string | undefined;
  idempotencyKey: string;
  resultCode?: string | undefined;
  resultMessage?: string | undefined;
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

export class MediaSecurityScanJob {
  readonly id: string;
  readonly workspaceId: string;
  readonly mediaAssetId: string;
  readonly status: MediaSecurityScanJobStatus;
  readonly scannerProvider: MediaSecurityScannerProvider;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly runAfter: Date;
  readonly lockedAt?: Date | undefined;
  readonly lockedBy?: string | undefined;
  readonly idempotencyKey: string;
  readonly resultCode?: string | undefined;
  readonly resultMessage?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: MediaSecurityScanJobProps) {
    this.id = required(props.id, 'id');
    this.workspaceId = required(props.workspaceId, 'workspaceId');
    this.mediaAssetId = required(props.mediaAssetId, 'mediaAssetId');
    this.status = props.status;
    this.scannerProvider = props.scannerProvider;
    this.attempts = props.attempts;
    this.maxAttempts = props.maxAttempts;
    this.runAfter = props.runAfter;
    this.lockedAt = props.lockedAt;
    this.lockedBy = props.lockedBy;
    this.idempotencyKey = required(props.idempotencyKey, 'idempotencyKey');
    this.resultCode = props.resultCode;
    this.resultMessage = props.resultMessage;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static enqueue(
    input: Pick<MediaSecurityScanJobProps, 'id' | 'workspaceId' | 'mediaAssetId' | 'idempotencyKey'> & {
      scannerProvider?: MediaSecurityScannerProvider;
    },
  ): MediaSecurityScanJob {
    const now = new Date();
    return new MediaSecurityScanJob({
      ...input,
      status: 'QUEUED',
      scannerProvider: input.scannerProvider ?? 'NOOP',
      attempts: 0,
      maxAttempts: 3,
      runAfter: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  claim(workerId: string, occurredAt = new Date()): MediaSecurityScanJob {
    if (this.status !== 'QUEUED' && this.status !== 'RETRYING') {
      throw new AppError('CONFLICT', 'job cannot be claimed', 409);
    }

    return new MediaSecurityScanJob({
      ...this,
      status: 'SCANNING',
      attempts: this.attempts + 1,
      lockedAt: occurredAt,
      lockedBy: workerId,
      updatedAt: occurredAt,
    });
  }

  succeed(result: { status: 'CLEAN' | 'INFECTED' | 'SUSPICIOUS'; resultCode: string; resultMessage: string }, occurredAt = new Date()): MediaSecurityScanJob {
    if (this.status !== 'SCANNING') {
      throw new AppError('CONFLICT', 'only scanning jobs can succeed', 409);
    }

    return new MediaSecurityScanJob({
      ...this,
      status: result.status === 'CLEAN' ? 'CLEAN' : 'INFECTED',
      resultCode: result.resultCode,
      resultMessage: result.resultMessage,
      lockedAt: undefined,
      lockedBy: undefined,
      updatedAt: occurredAt,
    });
  }

  fail(
    error: { code: string; message: string },
    occurredAt = new Date(),
  ): MediaSecurityScanJob {
    if (this.status !== 'SCANNING') {
      throw new AppError('CONFLICT', 'only scanning jobs can fail', 409);
    }

    const isTerminal = this.attempts >= this.maxAttempts;

    return new MediaSecurityScanJob({
      ...this,
      status: isTerminal ? 'DEAD' : 'FAILED',
      resultCode: error.code,
      resultMessage: error.message,
      lockedAt: undefined,
      lockedBy: undefined,
      updatedAt: occurredAt,
    });
  }

  scheduleRetry(runAfter: Date, occurredAt = new Date()): MediaSecurityScanJob {
    if (this.status !== 'FAILED') {
      throw new AppError('CONFLICT', 'only failed jobs can be retried', 409);
    }

    return new MediaSecurityScanJob({
      ...this,
      status: 'RETRYING',
      runAfter,
      resultCode: undefined,
      resultMessage: undefined,
      updatedAt: occurredAt,
    });
  }
}
