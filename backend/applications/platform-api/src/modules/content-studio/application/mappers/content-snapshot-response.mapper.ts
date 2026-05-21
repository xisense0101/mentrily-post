import { ContentBlock, ContentPublishedSnapshot } from '../../domain/entities/index.js';
import { ContentBlockResponse, ContentPublishedSnapshotResponse } from '../dto/index.js';

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

export function mapContentSnapshotToResponse(
  snapshot: ContentPublishedSnapshot,
): ContentPublishedSnapshotResponse {
  return {
    id: snapshot.id,
    documentId: snapshot.documentId,
    versionId: snapshot.versionId,
    versionNumber: snapshot.versionNumber,
    publishedByPrincipalId: snapshot.publishedByPrincipalId,
    publishedAt: snapshot.publishedAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString(),
    blocks: snapshot.blocks.map(mapBlock),
  };
}
