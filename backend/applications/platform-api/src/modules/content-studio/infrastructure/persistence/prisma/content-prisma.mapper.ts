import type { Prisma } from '@prisma/client';
import {
  BlockContentKind,
  BlockTreePath,
  ContentBlock,
  ContentDocument,
  ContentDocumentPurpose,
  ContentDocumentStatus,
  ContentPublishedSnapshot,
  ContentVersion,
  ContentVersionStatus,
} from '../../../domain/index.js';

type PersistenceBlock = {
  id: string;
  documentId: string;
  versionId: string;
  parentBlockId: string | null;
  kind: string;
  position: number;
  path: string;
  content: unknown;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PersistenceVersion = {
  id: string;
  documentId: string;
  versionNumber: number;
  status: string;
  createdByPrincipalId: string;
  createdAt: Date;
  publishedAt: Date | null;
  supersededAt: Date | null;
  blocks?: PersistenceBlock[];
};

type PersistenceSnapshot = {
  id: string;
  documentId: string;
  versionId: string;
  versionNumber: number;
  blocks: unknown;
  publishedByPrincipalId: string;
  publishedAt: Date;
  createdAt: Date;
};

type PersistenceDocument = {
  id: string;
  tenantId: string;
  workspaceId: string;
  ownerPrincipalId: string;
  purpose: string;
  status: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
  currentDraftVersion?: PersistenceVersion | null;
  publishedSnapshot?: PersistenceSnapshot | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function parsePath(path: string): BlockTreePath {
  return new BlockTreePath(path.split('.').map((segment) => Number.parseInt(segment, 10)));
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function sortBlocks<T extends { path: string; position: number }>(blocks: T[]): T[] {
  return [...blocks].sort((a, b) => {
    const pathCmp = a.path.localeCompare(b.path, undefined, { numeric: true });
    if (pathCmp !== 0) {
      return pathCmp;
    }

    return a.position - b.position;
  });
}

export function toDomainBlock(record: PersistenceBlock): ContentBlock {
  return new ContentBlock({
    id: record.id,
    documentId: record.documentId,
    ...(record.parentBlockId ? { parentBlockId: record.parentBlockId } : {}),
    kind: record.kind as BlockContentKind,
    position: record.position,
    path: parsePath(record.path),
    content: asRecord(record.content),
    metadata: asRecord(record.metadata),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDomainVersion(record: PersistenceVersion): ContentVersion {
  return new ContentVersion({
    id: record.id,
    documentId: record.documentId,
    versionNumber: record.versionNumber,
    status: record.status as ContentVersionStatus,
    blocks: sortBlocks(record.blocks ?? []).map(toDomainBlock),
    createdByPrincipalId: record.createdByPrincipalId,
    createdAt: record.createdAt,
    ...(record.publishedAt ? { publishedAt: record.publishedAt } : {}),
    ...(record.supersededAt ? { supersededAt: record.supersededAt } : {}),
  });
}

export function toDomainSnapshot(record: PersistenceSnapshot): ContentPublishedSnapshot {
  const blockRecords =
    typeof record.blocks === 'object' && record.blocks !== null && !Array.isArray(record.blocks)
      ? (record.blocks as { blocks?: unknown[] }).blocks ?? []
      : [];
  const blocks = Array.isArray(blockRecords)
    ? blockRecords.map((block) => {
        const value = asRecord(block);
        return new ContentBlock({
          id: String(value.id),
          documentId: String(value.documentId ?? record.documentId),
          ...(value.parentBlockId ? { parentBlockId: String(value.parentBlockId) } : {}),
          kind: String(value.kind) as BlockContentKind,
          position: Number(value.position),
          path: parsePath(String(value.path)),
          content: asRecord(value.content),
          metadata: asRecord(value.metadata),
          createdAt: new Date(String(value.createdAt)),
          updatedAt: new Date(String(value.updatedAt)),
        });
      })
    : [];

  return new ContentPublishedSnapshot({
    id: record.id,
    documentId: record.documentId,
    versionId: record.versionId,
    versionNumber: record.versionNumber,
    blocks,
    publishedByPrincipalId: record.publishedByPrincipalId,
    publishedAt: record.publishedAt,
    createdAt: record.createdAt,
  });
}

export function toDomainDocument(record: PersistenceDocument): ContentDocument {
  return new ContentDocument({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    ownerPrincipalId: record.ownerPrincipalId,
    purpose: record.purpose as ContentDocumentPurpose,
    status: record.status as ContentDocumentStatus,
    title: record.title,
    ...(record.currentDraftVersion ? { currentDraftVersion: toDomainVersion(record.currentDraftVersion) } : {}),
    ...(record.publishedSnapshot ? { publishedSnapshot: toDomainSnapshot(record.publishedSnapshot) } : {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.publishedAt ? { publishedAt: record.publishedAt } : {}),
    ...(record.archivedAt ? { archivedAt: record.archivedAt } : {}),
  });
}

export function toPersistenceDocumentCreate(document: ContentDocument) {
  return {
    id: document.id,
    tenantId: document.tenantId,
    workspaceId: document.workspaceId,
    ownerPrincipalId: document.ownerPrincipalId,
    purpose: document.purpose,
    status: document.status,
    title: document.title,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    ...(document.publishedAt ? { publishedAt: document.publishedAt } : {}),
    ...(document.archivedAt ? { archivedAt: document.archivedAt } : {}),
  };
}

export function toPersistenceDocumentUpdate(document: ContentDocument) {
  return {
    tenantId: document.tenantId,
    workspaceId: document.workspaceId,
    ownerPrincipalId: document.ownerPrincipalId,
    purpose: document.purpose,
    status: document.status,
    title: document.title,
    updatedAt: document.updatedAt,
    publishedAt: document.publishedAt ?? null,
    archivedAt: document.archivedAt ?? null,
  };
}

export function toPersistenceVersionCreate(version: ContentVersion) {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    status: version.status,
    createdByPrincipalId: version.createdByPrincipalId,
    createdAt: version.createdAt,
    ...(version.publishedAt ? { publishedAt: version.publishedAt } : {}),
    ...(version.supersededAt ? { supersededAt: version.supersededAt } : {}),
    document: { connect: { id: version.documentId } },
  };
}

export function toPersistenceVersionUpdate(version: ContentVersion) {
  return {
    versionNumber: version.versionNumber,
    status: version.status,
    createdByPrincipalId: version.createdByPrincipalId,
    createdAt: version.createdAt,
    publishedAt: version.publishedAt ?? null,
    supersededAt: version.supersededAt ?? null,
  };
}

export function toPersistenceBlockCreate(
  block: ContentBlock,
  versionId: string,
) {
  return {
    id: block.id,
    documentId: block.documentId,
    versionId,
    parentBlockId: block.parentBlockId ?? null,
    kind: block.kind,
    position: block.position,
    path: block.path.toString(),
    content: toInputJsonValue(block.content),
    metadata: toInputJsonValue(block.metadata),
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  };
}

export function toPersistenceSnapshotCreate(
  snapshot: ContentPublishedSnapshot,
){
  return {
    id: snapshot.id,
    documentId: snapshot.documentId,
    versionId: snapshot.versionId,
    versionNumber: snapshot.versionNumber,
    blocks: toInputJsonValue({
      blocks: snapshot.blocks.map((block) => ({
        id: block.id,
        documentId: block.documentId,
        ...(block.parentBlockId ? { parentBlockId: block.parentBlockId } : {}),
        kind: block.kind,
        position: block.position,
        path: block.path.toString(),
        content: toInputJsonValue(block.content),
        metadata: toInputJsonValue(block.metadata),
        createdAt: block.createdAt.toISOString(),
        updatedAt: block.updatedAt.toISOString(),
      })),
    }),
    publishedByPrincipalId: snapshot.publishedByPrincipalId,
    publishedAt: snapshot.publishedAt,
    createdAt: snapshot.createdAt,
  };
}
