import type { BlockContentKindContract, ContentBlockContract } from '../types';

function createLocalBlockId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `local-block-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createBlock(input: {
  content: Record<string, unknown>;
  documentId: string;
  kind: BlockContentKindContract;
  metadata?: Record<string, unknown>;
  position: number;
}): ContentBlockContract {
  return {
    id: createLocalBlockId(),
    kind: input.kind,
    position: input.position,
    path: String(input.position),
    content: input.content,
    metadata: input.metadata ?? {
      documentId: input.documentId,
      local: true,
    },
  };
}

export function createEmptyParagraphBlock(input: {
  documentId: string;
  position: number;
}): ContentBlockContract {
  return createBlock({
    documentId: input.documentId,
    kind: 'PARAGRAPH',
    position: input.position,
    content: { text: '' },
  });
}

export function createHeadingBlock(input: {
  documentId: string;
  position: number;
  text?: string;
}): ContentBlockContract {
  return createBlock({
    documentId: input.documentId,
    kind: 'HEADING',
    position: input.position,
    content: { text: input.text ?? '' },
  });
}

export function createCodeBlock(input: {
  documentId: string;
  position: number;
  code?: string;
  language?: string;
}): ContentBlockContract {
  return createBlock({
    documentId: input.documentId,
    kind: 'CODE',
    position: input.position,
    content: {
      code: input.code ?? '',
      language: input.language ?? 'text',
    },
  });
}

export function createCalloutBlock(input: {
  documentId: string;
  position: number;
  text?: string;
}): ContentBlockContract {
  return createBlock({
    documentId: input.documentId,
    kind: 'CALLOUT',
    position: input.position,
    content: { text: input.text ?? '' },
  });
}

export function normalizeBlockPositions(blocks: ContentBlockContract[]): ContentBlockContract[] {
  return [...blocks]
    .sort((left, right) => left.position - right.position || left.path.localeCompare(right.path))
    .map((block, index) => ({
      ...block,
      position: index,
      path: String(index),
    }));
}

export function replaceBlockContent(input: {
  blocks: ContentBlockContract[];
  blockId: string;
  content: Record<string, unknown>;
}): ContentBlockContract[] {
  return input.blocks.map((block) =>
    block.id === input.blockId
      ? {
          ...block,
          content: input.content,
        }
      : block,
  );
}

export function appendBlock(input: {
  blocks: ContentBlockContract[];
  block: ContentBlockContract;
}): ContentBlockContract[] {
  return normalizeBlockPositions([...input.blocks, input.block]);
}

export function removeBlock(input: {
  blocks: ContentBlockContract[];
  blockId: string;
}): ContentBlockContract[] {
  return normalizeBlockPositions(
    input.blocks.filter((block) => block.id !== input.blockId),
  );
}
