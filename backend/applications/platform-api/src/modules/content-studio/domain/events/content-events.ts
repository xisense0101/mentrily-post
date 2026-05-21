import { ContentDomainEvent } from './content-domain-event.js';

type ContentEventContext = {
  tenantId: string;
  workspaceId: string;
};

function assertContext(input: ContentEventContext): void {
  if (!input.tenantId) throw new Error('tenantId required');
  if (!input.workspaceId) throw new Error('workspaceId required');
}

function createEvent<TPayload>(input: ContentEventContext & {
  eventName: string;
  aggregateId: string;
  payload: TPayload;
}): ContentDomainEvent<TPayload> {
  assertContext(input);
  return {
    eventName: input.eventName,
    eventVersion: 1,
    occurredAt: new Date(),
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    aggregateId: input.aggregateId,
    payload: input.payload,
  };
}

export function contentDocumentCreated(input: ContentEventContext & {
  documentId: string;
  ownerPrincipalId: string;
  purpose: string;
  title: string;
}): ContentDomainEvent<{ documentId: string; ownerPrincipalId: string; purpose: string; title: string }> {
  return createEvent({
    ...input,
    eventName: 'content.document.created',
    aggregateId: input.documentId,
    payload: {
      documentId: input.documentId,
      ownerPrincipalId: input.ownerPrincipalId,
      purpose: input.purpose,
      title: input.title,
    },
  });
}

export function contentDocumentRenamed(input: ContentEventContext & {
  documentId: string;
  title: string;
}): ContentDomainEvent<{ documentId: string; title: string }> {
  return createEvent({
    ...input,
    eventName: 'content.document.renamed',
    aggregateId: input.documentId,
    payload: { documentId: input.documentId, title: input.title },
  });
}

export function contentDocumentDraftBlocksReplaced(input: ContentEventContext & {
  documentId: string;
  versionId: string;
  blockCount: number;
}): ContentDomainEvent<{ documentId: string; versionId: string; blockCount: number }> {
  return createEvent({
    ...input,
    eventName: 'content.document.draft_blocks_replaced',
    aggregateId: input.documentId,
    payload: { documentId: input.documentId, versionId: input.versionId, blockCount: input.blockCount },
  });
}

export function contentDocumentPublished(input: ContentEventContext & {
  documentId: string;
  versionId: string;
  snapshotId: string;
  versionNumber: number;
}): ContentDomainEvent<{ documentId: string; versionId: string; snapshotId: string; versionNumber: number }> {
  return createEvent({
    ...input,
    eventName: 'content.document.published',
    aggregateId: input.documentId,
    payload: {
      documentId: input.documentId,
      versionId: input.versionId,
      snapshotId: input.snapshotId,
      versionNumber: input.versionNumber,
    },
  });
}

export function contentDocumentArchived(input: ContentEventContext & {
  documentId: string;
}): ContentDomainEvent<{ documentId: string }> {
  return createEvent({
    ...input,
    eventName: 'content.document.archived',
    aggregateId: input.documentId,
    payload: { documentId: input.documentId },
  });
}

export function contentVersionCreated(input: ContentEventContext & {
  documentId: string;
  versionId: string;
  versionNumber: number;
}): ContentDomainEvent<{ documentId: string; versionId: string; versionNumber: number }> {
  return createEvent({
    ...input,
    eventName: 'content.version.created',
    aggregateId: input.versionId,
    payload: { documentId: input.documentId, versionId: input.versionId, versionNumber: input.versionNumber },
  });
}

export function contentVersionPublished(input: ContentEventContext & {
  documentId: string;
  versionId: string;
  versionNumber: number;
}): ContentDomainEvent<{ documentId: string; versionId: string; versionNumber: number }> {
  return createEvent({
    ...input,
    eventName: 'content.version.published',
    aggregateId: input.versionId,
    payload: { documentId: input.documentId, versionId: input.versionId, versionNumber: input.versionNumber },
  });
}

export function contentSnapshotCreated(input: ContentEventContext & {
  documentId: string;
  snapshotId: string;
  versionId: string;
  versionNumber: number;
}): ContentDomainEvent<{ documentId: string; snapshotId: string; versionId: string; versionNumber: number }> {
  return createEvent({
    ...input,
    eventName: 'content.snapshot.created',
    aggregateId: input.snapshotId,
    payload: {
      documentId: input.documentId,
      snapshotId: input.snapshotId,
      versionId: input.versionId,
      versionNumber: input.versionNumber,
    },
  });
}
