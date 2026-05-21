'use client';

import { useState } from 'react';
import { contentApiClient } from '../api';
import {
  ContentDocumentCard,
  ContentDocumentCreateForm,
  ContentDocumentEmptyState,
  ContentDocumentListSkeleton,
} from '../components/documents';
import { ContentErrorState, ContentPageHeader } from '../components/shared';
import { useContentDocuments } from '../hooks';

export function ContentDocumentsPage() {
  const { documents, loading, error, refresh, createDocument } =
    useContentDocuments(contentApiClient);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCreateDocument(
    input: Parameters<typeof createDocument>[0],
  ): Promise<void> {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createDocument(input);
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : 'Content document creation failed.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8" data-testid="content-documents-page">
      <ContentPageHeader
        eyebrow="Content Studio"
        title="Content documents"
        description="Create reusable authoring drafts, manage purpose-aligned documents, and enter the first Content Studio editor shell."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <ContentDocumentCreateForm
          errorMessage={submitError}
          isPending={isSubmitting}
          onSubmit={handleCreateDocument}
        />

        <section className="space-y-4 rounded-[2rem] border border-portal-border bg-white/75 p-4 shadow-portal-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-2 pt-1">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Document library</h2>
              <p className="text-sm text-slate-600">
                Drafts stay organized here before editor and publish actions.
              </p>
            </div>
            <div className="rounded-full border border-portal-border bg-portal-surface-muted px-3 py-1 text-xs font-semibold text-portal-text-muted">
              {documents.length} documents
            </div>
          </div>
          {loading ? <ContentDocumentListSkeleton /> : null}
          {!loading && error ? (
            <ContentErrorState message={error} onRetry={() => void refresh()} />
          ) : null}
          {!loading && !error && documents.length === 0 ? <ContentDocumentEmptyState /> : null}
          {!loading && !error && documents.length > 0 ? (
            <div className="grid gap-4" data-testid="content-document-list">
              {documents.map((document) => (
                <ContentDocumentCard
                  document={document}
                  href={`/content/documents/${document.id}`}
                  key={document.id}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
