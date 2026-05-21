import type { MediaFileCategory } from '../value-objects/index.js';
import type { MediaDomainEvent } from './media-domain-event.js';

interface BasePayload {
  assetId: string;
  objectKey: string;
  contentType: string;
  fileCategory: MediaFileCategory;
}

function eventOf<TPayload extends BasePayload & Record<string, unknown>>(input: {
  eventName: MediaDomainEvent<TPayload>['eventName'];
  aggregateId: string;
  tenantId: string;
  workspaceId: string;
  payload: TPayload;
  occurredAt?: Date | undefined;
}): MediaDomainEvent<TPayload> {
  return {
    eventName: input.eventName,
    eventVersion: 1,
    aggregateId: input.aggregateId,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    occurredAt: input.occurredAt ?? new Date(),
    payload: input.payload,
  };
}

export const mediaAssetCreated = (input: {
  tenantId: string;
  workspaceId: string;
  assetId: string;
  objectKey: string;
  contentType: string;
  fileCategory: MediaFileCategory;
}) =>
  eventOf({
    eventName: 'media.asset.created',
    aggregateId: input.assetId,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    payload: input,
  });

export const mediaUploadIntentCreated = (input: {
  tenantId: string;
  workspaceId: string;
  uploadIntentId: string;
  assetId: string;
  objectKey: string;
  contentType: string;
  fileCategory: MediaFileCategory;
}) =>
  eventOf({
    eventName: 'media.upload_intent.created',
    aggregateId: input.uploadIntentId,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    payload: input,
  });

export const mediaUploadCompleted = (input: {
  tenantId: string;
  workspaceId: string;
  uploadIntentId: string;
  assetId: string;
  objectKey: string;
  contentType: string;
  fileCategory: MediaFileCategory;
}) =>
  eventOf({
    eventName: 'media.upload.completed',
    aggregateId: input.uploadIntentId,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    payload: input,
  });

export const mediaUploadFailed = (input: {
  tenantId: string;
  workspaceId: string;
  uploadIntentId: string;
  assetId: string;
  objectKey: string;
  contentType: string;
  fileCategory: MediaFileCategory;
}) =>
  eventOf({
    eventName: 'media.upload.failed',
    aggregateId: input.uploadIntentId,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    payload: input,
  });

export const mediaAssetArchived = (input: {
  tenantId: string;
  workspaceId: string;
  assetId: string;
  objectKey: string;
  contentType: string;
  fileCategory: MediaFileCategory;
}) =>
  eventOf({
    eventName: 'media.asset.archived',
    aggregateId: input.assetId,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    payload: input,
  });

export const mediaReadUrlCreated = (input: {
  tenantId: string;
  workspaceId: string;
  assetId: string;
  objectKey: string;
  contentType: string;
  fileCategory: MediaFileCategory;
}) =>
  eventOf({
    eventName: 'media.read_url.created',
    aggregateId: input.assetId,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    payload: input,
  });
