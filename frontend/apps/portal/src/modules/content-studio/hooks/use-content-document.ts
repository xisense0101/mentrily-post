'use client';

import { useEffect, useState } from 'react';
import type { contentApiClient } from '../api';
import {
  appendBlock,
  createCalloutBlock,
  createCodeBlock,
  createEmptyParagraphBlock,
  createHeadingBlock,
  normalizeBlockPositions,
  removeBlock,
  replaceBlockContent,
} from '../state';
import type {
  BlockContentKindContract,
  ContentBlockContract,
  ContentDocumentContract,
  UpdateContentDocumentRequest,
} from '../types';

type ContentDocumentApi = Pick<
  typeof contentApiClient,
  | 'archiveContentDocument'
  | 'getContentDocument'
  | 'publishContentDocument'
  | 'replaceContentBlocks'
  | 'restoreContentDocument'
  | 'updateContentDocument'
>;

function blocksFromDocument(document: ContentDocumentContract | null): ContentBlockContract[] {
  return normalizeBlockPositions(document?.currentDraftVersion?.blocks ?? []);
}

export function useContentDocument(
  documentId: string,
  apiClient: ContentDocumentApi,
) {
  const [document, setDocument] = useState<ContentDocumentContract | null>(null);
  const [localBlocks, setLocalBlocks] = useState<ContentBlockContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const nextDocument = await apiClient.getContentDocument(documentId);
      setDocument(nextDocument);
      setLocalBlocks(blocksFromDocument(nextDocument));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Content document loading failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [documentId]);

  async function renameDocument(input: UpdateContentDocumentRequest) {
    if (!document) {
      return;
    }

    setIsRenaming(true);
    try {
      const nextDocument = await apiClient.updateContentDocument(document.id, input);
      setDocument(nextDocument);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Content document rename failed.');
    } finally {
      setIsRenaming(false);
    }
  }

  async function saveBlocks() {
    if (!document) {
      return;
    }

    setIsSaving(true);
    try {
      const nextDocument = await apiClient.replaceContentBlocks(document.id, {
        blocks: normalizeBlockPositions(localBlocks),
      });
      setDocument(nextDocument);
      setLocalBlocks(blocksFromDocument(nextDocument));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Block save failed.');
      throw cause;
    } finally {
      setIsSaving(false);
    }
  }

  function appendDraftBlock(kind: BlockContentKindContract) {
    if (!document) {
      return;
    }

    const position = localBlocks.length;
    let block: ContentBlockContract;

    if (kind === 'HEADING' || kind === 'SUBHEADING') {
      block = createHeadingBlock({ documentId: document.id, position, text: '' });
      if (kind === 'SUBHEADING') {
        block = { ...block, kind: 'SUBHEADING' };
      }
    } else if (kind === 'CODE') {
      block = createCodeBlock({ documentId: document.id, position });
    } else if (kind === 'CALLOUT') {
      block = createCalloutBlock({ documentId: document.id, position });
    } else if (kind === 'DIVIDER') {
      block = {
        ...createEmptyParagraphBlock({ documentId: document.id, position }),
        kind: 'DIVIDER',
        content: {},
      };
    } else if (kind === 'IMAGE' || kind === 'VIDEO' || kind === 'FILE') {
      block = {
        ...createEmptyParagraphBlock({ documentId: document.id, position }),
        kind,
        content: { mediaAssetId: '' },
      };
    } else {
      block = createEmptyParagraphBlock({ documentId: document.id, position });
      if (kind === 'QUOTE') {
        block = { ...block, kind: 'QUOTE' };
      }
    }

    setLocalBlocks((current) => appendBlock({ blocks: current, block }));
  }

  function updateBlockContent(blockId: string, content: Record<string, unknown>) {
    setLocalBlocks((current) => replaceBlockContent({ blocks: current, blockId, content }));
  }

  function removeDraftBlock(blockId: string) {
    setLocalBlocks((current) => removeBlock({ blocks: current, blockId }));
  }

  async function publishDocument() {
    if (!document) {
      return;
    }

    setIsPublishing(true);
    try {
      const nextDocument = await apiClient.publishContentDocument(document.id);
      setDocument(nextDocument);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Publish failed.');
      throw cause;
    } finally {
      setIsPublishing(false);
    }
  }

  async function archiveDocument() {
    if (!document) {
      return;
    }

    setIsArchiving(true);
    try {
      const nextDocument = await apiClient.archiveContentDocument(document.id);
      setDocument(nextDocument);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Archive failed.');
      throw cause;
    } finally {
      setIsArchiving(false);
    }
  }

  async function restoreDocument() {
    if (!document) {
      return;
    }

    setIsRestoring(true);
    try {
      const nextDocument = await apiClient.restoreContentDocument(document.id);
      setDocument(nextDocument);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Restore failed.');
      throw cause;
    } finally {
      setIsRestoring(false);
    }
  }

  return {
    document,
    localBlocks,
    loading,
    error,
    isSaving,
    isPublishing,
    isArchiving,
    isRestoring,
    isRenaming,
    refresh,
    renameDocument,
    saveBlocks,
    appendBlock: appendDraftBlock,
    updateBlockContent,
    removeBlock: removeDraftBlock,
    publishDocument,
    archiveDocument,
    restoreDocument,
  };
}
