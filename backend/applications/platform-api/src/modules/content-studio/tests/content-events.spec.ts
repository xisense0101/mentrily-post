import { describe, expect, it } from 'vitest';
import {
  contentDocumentArchived,
  contentDocumentCreated,
  contentDocumentDraftBlocksReplaced,
  contentDocumentPublished,
  contentDocumentRenamed,
  contentSnapshotCreated,
  contentVersionCreated,
  contentVersionPublished,
} from '../domain/events/content-events.js';

function assertEventContext(event: {
  tenantId: string;
  workspaceId: string;
  eventVersion: number;
}) {
  expect(event.eventVersion).toBe(1);
  expect(event.tenantId).not.toBe('');
  expect(event.workspaceId).not.toBe('');
}

describe('Content events', () => {
  it('content.document.created factory preserves context and payload', () => {
    const event = contentDocumentCreated({
      tenantId: 't1',
      workspaceId: 'w1',
      documentId: 'd1',
      ownerPrincipalId: 'p1',
      purpose: 'COURSE_CONTENT',
      title: 'Doc',
    });
    expect(event.eventName).toBe('content.document.created');
    expect(event.tenantId).toBe('t1');
    expect(event.workspaceId).toBe('w1');
    expect(event.aggregateId).toBe('d1');
    expect(event.payload).toEqual({
      documentId: 'd1',
      ownerPrincipalId: 'p1',
      purpose: 'COURSE_CONTENT',
      title: 'Doc',
    });
    assertEventContext(event);
  });

  it('content.document.renamed factory preserves context and payload', () => {
    const event = contentDocumentRenamed({
      tenantId: 't1',
      workspaceId: 'w1',
      documentId: 'd1',
      title: 'Renamed',
    });
    expect(event.eventName).toBe('content.document.renamed');
    expect(event.tenantId).toBe('t1');
    expect(event.workspaceId).toBe('w1');
    expect(event.aggregateId).toBe('d1');
    expect(event.payload).toEqual({ documentId: 'd1', title: 'Renamed' });
    assertEventContext(event);
  });

  it('content.document.draft_blocks_replaced factory preserves context and payload', () => {
    const event = contentDocumentDraftBlocksReplaced({
      tenantId: 't1',
      workspaceId: 'w1',
      documentId: 'd1',
      versionId: 'v1',
      blockCount: 4,
    });
    expect(event.eventName).toBe('content.document.draft_blocks_replaced');
    expect(event.tenantId).toBe('t1');
    expect(event.workspaceId).toBe('w1');
    expect(event.aggregateId).toBe('d1');
    expect(event.payload).toEqual({ documentId: 'd1', versionId: 'v1', blockCount: 4 });
    assertEventContext(event);
  });

  it('content.document.published factory preserves context and payload', () => {
    const event = contentDocumentPublished({
      tenantId: 't1',
      workspaceId: 'w1',
      documentId: 'd1',
      versionId: 'v1',
      snapshotId: 's1',
      versionNumber: 2,
    });
    expect(event.eventName).toBe('content.document.published');
    expect(event.tenantId).toBe('t1');
    expect(event.workspaceId).toBe('w1');
    expect(event.aggregateId).toBe('d1');
    expect(event.payload).toEqual({
      documentId: 'd1',
      versionId: 'v1',
      snapshotId: 's1',
      versionNumber: 2,
    });
    assertEventContext(event);
  });

  it('content.document.archived factory preserves context and payload', () => {
    const event = contentDocumentArchived({ tenantId: 't1', workspaceId: 'w1', documentId: 'd1' });
    expect(event.eventName).toBe('content.document.archived');
    expect(event.tenantId).toBe('t1');
    expect(event.workspaceId).toBe('w1');
    expect(event.aggregateId).toBe('d1');
    expect(event.payload).toEqual({ documentId: 'd1' });
    assertEventContext(event);
  });

  it('content.version.created factory preserves context and payload', () => {
    const event = contentVersionCreated({
      tenantId: 't1',
      workspaceId: 'w1',
      documentId: 'd1',
      versionId: 'v1',
      versionNumber: 1,
    });
    expect(event.eventName).toBe('content.version.created');
    expect(event.tenantId).toBe('t1');
    expect(event.workspaceId).toBe('w1');
    expect(event.aggregateId).toBe('v1');
    expect(event.payload).toEqual({ documentId: 'd1', versionId: 'v1', versionNumber: 1 });
    assertEventContext(event);
  });

  it('content.version.published factory preserves context and payload', () => {
    const event = contentVersionPublished({
      tenantId: 't1',
      workspaceId: 'w1',
      documentId: 'd1',
      versionId: 'v1',
      versionNumber: 1,
    });
    expect(event.eventName).toBe('content.version.published');
    expect(event.tenantId).toBe('t1');
    expect(event.workspaceId).toBe('w1');
    expect(event.aggregateId).toBe('v1');
    expect(event.payload).toEqual({ documentId: 'd1', versionId: 'v1', versionNumber: 1 });
    assertEventContext(event);
  });

  it('content.snapshot.created factory preserves context and payload', () => {
    const event = contentSnapshotCreated({
      tenantId: 't1',
      workspaceId: 'w1',
      documentId: 'd1',
      snapshotId: 's1',
      versionId: 'v1',
      versionNumber: 1,
    });
    expect(event.eventName).toBe('content.snapshot.created');
    expect(event.tenantId).toBe('t1');
    expect(event.workspaceId).toBe('w1');
    expect(event.aggregateId).toBe('s1');
    expect(event.payload).toEqual({
      documentId: 'd1',
      snapshotId: 's1',
      versionId: 'v1',
      versionNumber: 1,
    });
    assertEventContext(event);
  });
});
