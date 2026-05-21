import { describe, expect, it } from 'vitest';
import { ContentBlock, ContentVersion } from '../domain/entities/index.js';
import { ContentVersioningPolicyService } from '../domain/services/content-versioning-policy.service.js';
import {
  BlockContentKind,
  BlockTreePath,
  ContentVersionStatus,
} from '../domain/value-objects/index.js';

function block(id: string, position: number): ContentBlock {
  return ContentBlock.create({
    id,
    documentId: 'doc-1',
    kind: BlockContentKind.PARAGRAPH,
    position,
    path: new BlockTreePath([position]),
    content: { text: id },
    metadata: {},
  });
}

describe('ContentVersion domain', () => {
  it('draft version can be created', () => {
    const version = ContentVersion.createDraft({
      id: 'ver-1',
      documentId: 'doc-1',
      versionNumber: 1,
      blocks: [block('block-1', 0)],
      createdByPrincipalId: 'principal-1',
    });
    expect(version.status).toBe(ContentVersionStatus.DRAFT);
  });

  it('versionNumber must be >= 1', () => {
    expect(() =>
      ContentVersion.createDraft({
        id: 'ver-1',
        documentId: 'doc-1',
        versionNumber: 0,
        blocks: [],
        createdByPrincipalId: 'principal-1',
      }),
    ).toThrow('versionNumber must be >= 1');
  });

  it('draft version can replace blocks', () => {
    const version = ContentVersion.createDraft({
      id: 'ver-1',
      documentId: 'doc-1',
      versionNumber: 1,
      blocks: [block('block-1', 0)],
      createdByPrincipalId: 'principal-1',
    });
    version.replaceBlocks([block('block-2', 0)]);
    expect(version.blocks.map((item) => item.id)).toEqual(['block-2']);
  });

  it('published snapshot version cannot replace blocks', () => {
    const version = ContentVersion.createDraft({
      id: 'ver-1',
      documentId: 'doc-1',
      versionNumber: 1,
      blocks: [block('block-1', 0)],
      createdByPrincipalId: 'principal-1',
    });
    version.publishSnapshot();
    expect(() => version.replaceBlocks([block('block-2', 0)])).toThrow(
      'only draft versions can be replaced',
    );
  });

  it('draft version can publish', () => {
    const version = ContentVersion.createDraft({
      id: 'ver-1',
      documentId: 'doc-1',
      versionNumber: 1,
      blocks: [block('block-1', 0)],
      createdByPrincipalId: 'principal-1',
    });
    version.publishSnapshot();
    expect(version.status).toBe(ContentVersionStatus.PUBLISHED_SNAPSHOT);
  });

  it('published version can become superseded', () => {
    const version = ContentVersion.createDraft({
      id: 'ver-1',
      documentId: 'doc-1',
      versionNumber: 1,
      blocks: [block('block-1', 0)],
      createdByPrincipalId: 'principal-1',
    });
    version.publishSnapshot();
    version.markSuperseded();
    expect(version.status).toBe(ContentVersionStatus.SUPERSEDED);
  });

  it('superseded version cannot be edited', () => {
    const version = ContentVersion.createDraft({
      id: 'ver-1',
      documentId: 'doc-1',
      versionNumber: 1,
      blocks: [block('block-1', 0)],
      createdByPrincipalId: 'principal-1',
    });
    version.publishSnapshot();
    version.markSuperseded();
    expect(() => version.replaceBlocks([block('block-2', 0)])).toThrow(
      'only draft versions can be replaced',
    );
  });

  it('nextVersionNumber starts at 1', () => {
    const service = new ContentVersioningPolicyService();
    expect(service.nextVersionNumber([])).toBe(1);
  });

  it('nextVersionNumber increments from max existing version', () => {
    const service = new ContentVersioningPolicyService();
    const versions = [
      ContentVersion.createDraft({
        id: 'v1',
        documentId: 'doc-1',
        versionNumber: 1,
        blocks: [],
        createdByPrincipalId: 'p1',
      }),
      ContentVersion.createDraft({
        id: 'v4',
        documentId: 'doc-1',
        versionNumber: 4,
        blocks: [],
        createdByPrincipalId: 'p1',
      }),
    ];
    expect(service.nextVersionNumber(versions)).toBe(5);
  });
});
