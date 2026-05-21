import { describe, expect, it } from 'vitest';
import {
  ContentBlock,
  ContentDocument,
  ContentPublishedSnapshot,
  ContentVersion,
} from '../domain/entities/index.js';
import {
  BlockContentKind,
  BlockTreePath,
  ContentDocumentPurpose,
  ContentDocumentStatus,
} from '../domain/value-objects/index.js';

function block(id: string): ContentBlock {
  return ContentBlock.create({
    id,
    documentId: 'doc-1',
    kind: BlockContentKind.PARAGRAPH,
    position: 0,
    path: new BlockTreePath([0]),
    content: { text: 'hello' },
    metadata: {},
  });
}

function draftVersion(blocks: ContentBlock[] = [block('block-1')]): ContentVersion {
  return ContentVersion.createDraft({
    id: 'ver-1',
    documentId: 'doc-1',
    versionNumber: 1,
    blocks,
    createdByPrincipalId: 'owner-1',
  });
}

describe('ContentDocument domain', () => {
  it('draft document can be created with tenant, workspace, and owner', () => {
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Doc',
      currentDraftVersion: draftVersion(),
    });
    expect(document.status).toBe(ContentDocumentStatus.DRAFT);
  });

  it('empty title is rejected', () => {
    expect(() =>
      ContentDocument.createDraft({
        id: 'doc-1',
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
        ownerPrincipalId: 'owner-1',
        purpose: ContentDocumentPurpose.COURSE_CONTENT,
        title: '',
        currentDraftVersion: draftVersion(),
      }),
    ).toThrow('title cannot be empty');
  });

  it('document can be renamed', () => {
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Old',
      currentDraftVersion: draftVersion(),
    });
    document.rename('New');
    expect(document.title).toBe('New');
  });

  it('draft blocks can be replaced', () => {
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Doc',
      currentDraftVersion: draftVersion(),
    });
    document.replaceDraftBlocks([block('block-2')]);
    expect(document.currentDraftVersion?.blocks[0]?.id).toBe('block-2');
  });

  it('document cannot publish without draft version', () => {
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Doc',
    });
    const version = draftVersion([block('block-1')]);
    version.publishSnapshot();
    const snapshot = ContentPublishedSnapshot.createFromVersion({
      id: 'snapshot-1',
      version,
      publishedByPrincipalId: 'owner-1',
    });
    expect(() => document.publish(snapshot)).toThrow(
      'document cannot publish without draft version',
    );
  });

  it('document cannot publish empty draft', () => {
    const emptyDraft = draftVersion([]);
    emptyDraft.publishSnapshot();
    const snapshot = ContentPublishedSnapshot.createFromVersion({
      id: 'snapshot-1',
      version: emptyDraft,
      publishedByPrincipalId: 'owner-1',
    });
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Doc',
      currentDraftVersion: emptyDraft,
    });
    expect(() => document.publish(snapshot)).toThrow('document cannot publish empty content');
  });

  it('document can publish valid draft snapshot', () => {
    const version = draftVersion();
    version.publishSnapshot();
    const snapshot = ContentPublishedSnapshot.createFromVersion({
      id: 'snapshot-1',
      version,
      publishedByPrincipalId: 'owner-1',
    });
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Doc',
      currentDraftVersion: version,
    });
    document.publish(snapshot);
    expect(document.status).toBe(ContentDocumentStatus.PUBLISHED);
    expect(document.publishedSnapshot?.id).toBe('snapshot-1');
  });

  it('publishedAt is set after publish', () => {
    const version = draftVersion();
    version.publishSnapshot();
    const snapshot = ContentPublishedSnapshot.createFromVersion({
      id: 'snapshot-1',
      version,
      publishedByPrincipalId: 'owner-1',
    });
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Doc',
      currentDraftVersion: version,
    });
    document.publish(snapshot);
    expect(document.publishedAt).toBeInstanceOf(Date);
  });

  it('document can archive', () => {
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Doc',
      currentDraftVersion: draftVersion(),
    });
    document.archive();
    expect(document.status).toBe(ContentDocumentStatus.ARCHIVED);
  });

  it('archived document cannot be modified', () => {
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Doc',
      currentDraftVersion: draftVersion(),
    });
    document.archive();
    expect(() => document.rename('Changed')).toThrow('archived document cannot be modified');
  });

  it('restoreToDraft clears archivedAt and published snapshot safely if product rule allows it', () => {
    const version = draftVersion();
    version.publishSnapshot();
    const snapshot = ContentPublishedSnapshot.createFromVersion({
      id: 'snapshot-1',
      version,
      publishedByPrincipalId: 'owner-1',
    });
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Doc',
      currentDraftVersion: version,
    });
    document.publish(snapshot);
    document.archive();
    document.restoreToDraft(version);
    expect(document.status).toBe(ContentDocumentStatus.DRAFT);
    expect('archivedAt' in document).toBe(false);
    expect('publishedSnapshot' in document).toBe(false);
  });
});
