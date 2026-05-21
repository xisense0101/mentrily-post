import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import {
  PrismaContentDocumentRepository,
  PrismaContentSnapshotRepository,
} from '../infrastructure/index.js';
import { createBlock, createDraftDocument } from './content-test-fixtures.js';
import {
  BlockContentKind,
  BlockTreePath,
  ContentDocumentPurpose,
  ContentPublishedSnapshot,
} from '../domain/index.js';

describe('Content Studio repositories (integration)', () => {
  let prisma: PrismaService;
  let documentRepo: PrismaContentDocumentRepository;
  let snapshotRepo: PrismaContentSnapshotRepository;

  beforeEach(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    documentRepo = new PrismaContentDocumentRepository(prisma);
    snapshotRepo = new PrismaContentSnapshotRepository(prisma);
    await truncatePublicSchema(prisma);
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('saves and loads a draft content document with deterministic blocks', async () => {
    const document = createDraftDocument({
      blocks: [
        createBlock({
          id: randomUUID(),
          documentId: '44444444-4444-4444-8444-444444444444',
          kind: BlockContentKind.HEADING,
          position: 1,
          path: new BlockTreePath([1]),
        }),
        createBlock({
          id: randomUUID(),
          documentId: '44444444-4444-4444-8444-444444444444',
          kind: BlockContentKind.PARAGRAPH,
          position: 0,
          path: new BlockTreePath([0]),
        }),
      ],
    });

    const saved = await documentRepo.save(document);
    const loaded = await documentRepo.findById(saved.id);

    expect(loaded?.id).toBe(saved.id);
    expect(loaded?.currentDraftVersion?.blocks.map((block) => block.path.toString())).toEqual([
      '0',
      '1',
    ]);
    expect(loaded?.tenantId).toBe('11111111-1111-4111-8111-111111111111');
    expect(loaded?.workspaceId).toBe('22222222-2222-4222-8222-222222222222');
    expect(loaded?.ownerPrincipalId).toBe('33333333-3333-4333-8333-333333333333');
  });

  it('replaces draft blocks', async () => {
    const document = createDraftDocument();
    const saved = await documentRepo.save(document);
    saved.replaceDraftBlocks([
      createBlock({ id: randomUUID(), documentId: saved.id, kind: BlockContentKind.CALLOUT }),
    ]);
    const updated = await documentRepo.save(saved);
    expect(updated.currentDraftVersion?.blocks).toHaveLength(1);
    expect(updated.currentDraftVersion?.blocks[0]?.kind).toBe(BlockContentKind.CALLOUT);
  });

  it('publishes snapshot and loads latest snapshot', async () => {
    const document = createDraftDocument();
    const savedDocument = await documentRepo.save(document);
    savedDocument.currentDraftVersion!.publishSnapshot();
    const snapshot = {
      id: randomUUID(),
      documentId: savedDocument.id,
      versionId: savedDocument.currentDraftVersion!.id,
      versionNumber: savedDocument.currentDraftVersion!.versionNumber,
      blocks: savedDocument.currentDraftVersion!.blocks,
      publishedByPrincipalId: '33333333-3333-4333-8333-333333333333',
      publishedAt: new Date(),
      createdAt: new Date(),
    };
    const savedSnapshot = await snapshotRepo.save(new ContentPublishedSnapshot(snapshot));
    const latest = await snapshotRepo.findLatestByDocumentId(savedDocument.id);
    expect(latest?.id).toBe(savedSnapshot.id);
  });

  it('archives document and lists by workspace/purpose', async () => {
    const first = createDraftDocument({
      id: randomUUID(),
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
    });
    const second = createDraftDocument({
      id: randomUUID(),
      purpose: ContentDocumentPurpose.GENERAL_PAGE,
    });
    first.archive();
    await documentRepo.save(first);
    await documentRepo.save(second);

    const listed = await documentRepo.listByWorkspace('22222222-2222-4222-8222-222222222222');
    const byPurpose = await documentRepo.listByPurpose(
      '22222222-2222-4222-8222-222222222222',
      ContentDocumentPurpose.GENERAL_PAGE,
    );

    expect(listed).toHaveLength(2);
    expect(listed.some((document) => document.status === 'ARCHIVED')).toBe(true);
    expect(byPurpose).toHaveLength(1);
    expect(byPurpose[0]?.purpose).toBe(ContentDocumentPurpose.GENERAL_PAGE);
  });
});
