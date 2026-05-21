import { ContentBlock, ContentDocument, ContentVersion } from '../../domain/entities/index.js';
import {
  ContentBlockResponse,
  ContentDocumentResponse,
  ContentVersionResponse,
} from '../dto/index.js';

function mapBlock(block: ContentBlock): ContentBlockResponse {
  return {
    id: block.id,
    ...(block.parentBlockId !== undefined ? { parentBlockId: block.parentBlockId } : {}),
    kind: String(block.kind) as ContentBlockResponse['kind'],
    position: block.position,
    path: block.path.toString(),
    content: { ...block.content },
    ...(Object.keys(block.metadata).length > 0 ? { metadata: { ...block.metadata } } : {}),
  };
}

function mapVersion(version: ContentVersion): ContentVersionResponse {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    status: String(version.status) as ContentVersionResponse['status'],
    createdByPrincipalId: version.createdByPrincipalId,
    createdAt: version.createdAt.toISOString(),
    ...(version.publishedAt ? { publishedAt: version.publishedAt.toISOString() } : {}),
    ...(version.supersededAt ? { supersededAt: version.supersededAt.toISOString() } : {}),
    blocks: version.blocks.map(mapBlock),
  };
}

export function mapContentDocumentToResponse(document: ContentDocument): ContentDocumentResponse {
  return {
    id: document.id,
    purpose: String(document.purpose) as ContentDocumentResponse['purpose'],
    status: String(document.status) as ContentDocumentResponse['status'],
    title: document.title,
    ownerPrincipalId: document.ownerPrincipalId,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    ...(document.publishedAt ? { publishedAt: document.publishedAt.toISOString() } : {}),
    ...(document.archivedAt ? { archivedAt: document.archivedAt.toISOString() } : {}),
    ...(document.currentDraftVersion ? { currentDraftVersion: mapVersion(document.currentDraftVersion) } : {}),
    ...(document.publishedSnapshot ? { publishedSnapshotId: document.publishedSnapshot.id } : {}),
  };
}
