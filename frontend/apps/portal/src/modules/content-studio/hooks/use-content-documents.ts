'use client';

import { useEffect, useState } from 'react';
import type { ContentDocumentContract, CreateContentDocumentRequest } from '../types';
import type { contentApiClient } from '../api';

type ContentDocumentsApi = Pick<
  typeof contentApiClient,
  'createContentDocument' | 'listContentDocuments'
>;

export function useContentDocuments(apiClient: ContentDocumentsApi) {
  const [documents, setDocuments] = useState<ContentDocumentContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const nextDocuments = await apiClient.listContentDocuments();
      setDocuments(nextDocuments);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Content document loading failed.');
    } finally {
      setLoading(false);
    }
  }

  async function createDocument(input: CreateContentDocumentRequest) {
    const created = await apiClient.createContentDocument(input);
    setDocuments((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    documents,
    loading,
    error,
    refresh,
    createDocument,
  };
}
