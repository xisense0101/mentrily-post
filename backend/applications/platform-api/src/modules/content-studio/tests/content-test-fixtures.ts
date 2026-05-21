import { randomUUID } from 'node:crypto';
import { RequestContext } from '@mentrily/service-core';
import {
  BlockContentKind,
  BlockTreePath,
  ContentBlock,
  ContentDocument,
  ContentDocumentPurpose,
  ContentVersion,
} from '../domain/index.js';

export function createContentRequestContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    requestId: 'req-content-test',
    correlationId: 'cor-content-test',
    timestamp: new Date().toISOString(),
    workspace: {
      tenantId: '11111111-1111-4111-8111-111111111111',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      actorId: '33333333-3333-4333-8333-333333333333',
    },
    ...overrides,
  };
}

export function createBlock(
  input?: Partial<ConstructorParameters<typeof ContentBlock>[0]>,
): ContentBlock {
  return ContentBlock.create({
    id: input?.id ?? randomUUID(),
    documentId: input?.documentId ?? '44444444-4444-4444-8444-444444444444',
    ...(input?.parentBlockId ? { parentBlockId: input.parentBlockId } : {}),
    kind: input?.kind ?? BlockContentKind.PARAGRAPH,
    position: input?.position ?? 0,
    path: input?.path ?? new BlockTreePath([0]),
    content: input?.content ?? { text: 'Hello' },
    metadata: input?.metadata ?? {},
  });
}

export function createDraftDocument(overrides?: {
  id?: string;
  tenantId?: string;
  workspaceId?: string;
  ownerPrincipalId?: string;
  purpose?: ContentDocumentPurpose;
  blocks?: ContentBlock[];
}) {
  const documentId = overrides?.id ?? '44444444-4444-4444-8444-444444444444';
  const version = ContentVersion.createDraft({
    id: randomUUID(),
    documentId,
    versionNumber: 1,
    blocks: overrides?.blocks ?? [createBlock({ documentId })],
    createdByPrincipalId: overrides?.ownerPrincipalId ?? '33333333-3333-4333-8333-333333333333',
  });

  return ContentDocument.createDraft({
    id: documentId,
    tenantId: overrides?.tenantId ?? '11111111-1111-4111-8111-111111111111',
    workspaceId: overrides?.workspaceId ?? '22222222-2222-4222-8222-222222222222',
    ownerPrincipalId: overrides?.ownerPrincipalId ?? '33333333-3333-4333-8333-333333333333',
    purpose: overrides?.purpose ?? ContentDocumentPurpose.COURSE_CONTENT,
    title: 'Document',
    currentDraftVersion: version,
  });
}
