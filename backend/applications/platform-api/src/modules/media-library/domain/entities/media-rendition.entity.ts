import { AppError } from '@mentrily/service-core';
import type { MediaRenditionKind } from '../value-objects/index.js';

export interface MediaRenditionProps {
  id: string;
  workspaceId: string;
  mediaAssetId: string;
  kind: MediaRenditionKind;
  mimeType: string;
  sizeBytes: number;
  width?: number | undefined;
  height?: number | undefined;
  durationSeconds?: number | undefined;
  storageKey: string;
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

export class MediaRendition {
  readonly id: string;
  readonly workspaceId: string;
  readonly mediaAssetId: string;
  readonly kind: MediaRenditionKind;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly durationSeconds?: number | undefined;
  readonly storageKey: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: MediaRenditionProps) {
    this.id = required(props.id, 'id');
    this.workspaceId = required(props.workspaceId, 'workspaceId');
    this.mediaAssetId = required(props.mediaAssetId, 'mediaAssetId');
    this.kind = props.kind;
    this.mimeType = required(props.mimeType, 'mimeType');
    this.sizeBytes = props.sizeBytes;
    this.width = props.width;
    this.height = props.height;
    this.durationSeconds = props.durationSeconds;
    this.storageKey = required(props.storageKey, 'storageKey');
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
