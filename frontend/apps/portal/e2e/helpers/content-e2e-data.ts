import type {
  ContentBlockContract,
  ContentDocumentContract,
  ContentDocumentPurposeContract,
  CreateContentDocumentRequest,
  ReplaceContentBlocksRequest,
} from '../../src/modules/content-studio/types';

function makeTimestamp(): number {
  return Date.now();
}

export function makeContentDocumentInput(
  purpose: ContentDocumentPurposeContract = 'GENERAL_PAGE',
): CreateContentDocumentRequest {
  const timestamp = makeTimestamp();

  return {
    title: `E2E Content ${timestamp}`,
    purpose,
  };
}

function makeBlockBase(
  kind: ContentBlockContract['kind'],
  position: number,
  content: Record<string, unknown>,
): ContentBlockContract {
  const timestamp = makeTimestamp();

  return {
    id: `${kind.toLowerCase()}-${timestamp}-${position}`,
    kind,
    position,
    path: String(position),
    content,
  };
}

export function makeParagraphBlockInput(position = 0): ContentBlockContract {
  return makeBlockBase('PARAGRAPH', position, {
    text: 'E2E paragraph block content',
  });
}

export function makeHeadingBlockInput(position = 0): ContentBlockContract {
  return makeBlockBase('HEADING', position, {
    text: 'E2E heading block content',
  });
}

export function makeCodeBlockInput(position = 0): ContentBlockContract {
  return makeBlockBase('CODE', position, {
    language: 'ts',
    code: 'const contentStudio = true;',
  });
}

export function makeCalloutBlockInput(position = 0): ContentBlockContract {
  return makeBlockBase('CALLOUT', position, {
    text: 'E2E callout block content',
  });
}

export function makeReplaceBlocksInput(
  blocks: ContentBlockContract[],
): ReplaceContentBlocksRequest {
  return {
    blocks,
  };
}

export function getDocumentId(document: ContentDocumentContract): string {
  return document.id;
}
