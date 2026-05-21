import { describe, expect, it } from 'vitest';
import { ContentBlock, ContentDocument, ContentVersion } from '../domain/entities/index.js';
import { ContentPublishPolicyService } from '../domain/services/content-publish-policy.service.js';
import {
  BlockContentKind,
  BlockTreePath,
  ContentDocumentPurpose,
} from '../domain/value-objects/index.js';

function block(kind: BlockContentKind = BlockContentKind.PARAGRAPH) {
  return ContentBlock.create({
    id: `block-${kind}`,
    documentId: 'doc-1',
    kind,
    position: 0,
    path: new BlockTreePath([0]),
    content: {},
    metadata: {},
  });
}

function draftDocument(input?: { purpose?: ContentDocumentPurpose; blocks?: ContentBlock[] }) {
  return ContentDocument.createDraft({
    id: 'doc-1',
    tenantId: 'tenant-1',
    workspaceId: 'workspace-1',
    ownerPrincipalId: 'owner-1',
    purpose: input?.purpose ?? ContentDocumentPurpose.COURSE_CONTENT,
    title: 'Doc',
    currentDraftVersion: ContentVersion.createDraft({
      id: 'ver-1',
      documentId: 'doc-1',
      versionNumber: 1,
      blocks: input?.blocks ?? [block()],
      createdByPrincipalId: 'owner-1',
    }),
  });
}

describe('ContentPublishPolicyService', () => {
  const service = new ContentPublishPolicyService();

  it('valid draft document with blocks can publish', () => {
    expect(service.canPublish(draftDocument()).allowed).toBe(true);
  });

  it('archived document cannot publish', () => {
    const document = draftDocument();
    document.archive();
    expect(service.canPublish(document).allowed).toBe(false);
  });

  it('published document cannot publish again', () => {
    const document = draftDocument();
    document.status = 'PUBLISHED' as never;
    expect(service.canPublish(document).allowed).toBe(false);
  });

  it('document without draft version cannot publish', () => {
    const document = ContentDocument.createDraft({
      id: 'doc-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      ownerPrincipalId: 'owner-1',
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      title: 'Doc',
    });
    expect(service.canPublish(document).allowed).toBe(false);
  });

  it('document with empty draft blocks cannot publish', () => {
    expect(service.canPublish(draftDocument({ blocks: [] })).allowed).toBe(false);
  });

  it('course content cannot publish reserved assessment blocks', () => {
    expect(
      service.canPublish(draftDocument({ blocks: [block(BlockContentKind.MCQ_QUESTION)] })).allowed,
    ).toBe(false);
  });

  it('reserved assessment document can contain reserved assessment blocks', () => {
    expect(
      service.canPublish(
        draftDocument({
          purpose: ContentDocumentPurpose.ASSESSMENT_CONTENT_RESERVED,
          blocks: [block(BlockContentKind.MCQ_QUESTION)],
        }),
      ).allowed,
    ).toBe(true);
  });
});
