'use client';

import { contentApiClient } from '../api';
import { ContentEditorShell } from '../components/editor';
import { ContentErrorState, ContentPageHeader } from '../components/shared';
import { useContentDocument } from '../hooks';

interface ContentDocumentEditorPageProps {
  documentId: string;
}

export function ContentDocumentEditorPage({
  documentId,
}: ContentDocumentEditorPageProps) {
  const {
    document,
    localBlocks,
    loading,
    error,
    isArchiving,
    isPublishing,
    isRenaming,
    isRestoring,
    isSaving,
    refresh,
    renameDocument,
    saveBlocks,
    appendBlock,
    updateBlockContent,
    removeBlock,
    publishDocument,
    archiveDocument,
    restoreDocument,
  } = useContentDocument(documentId, contentApiClient);

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-portal-border bg-white/80 p-8 text-sm text-slate-500 shadow-portal-sm">
        Loading content document...
      </div>
    );
  }

  if (error && !document) {
    return <ContentErrorState message={error} onRetry={() => void refresh()} />;
  }

  if (!document) {
    return (
      <ContentErrorState
        message="Content document data is unavailable."
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="content-document-editor-page">
      <ContentPageHeader
        eyebrow="Content Studio"
        title={document.title}
        description="Edit a simple draft block tree, save it through the backend API, and manage publish, archive, or restore actions."
        actions={
          <a
            className="rounded-full border border-portal-border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
            href="/content/documents"
          >
            Back to documents
          </a>
        }
      />
      <ContentEditorShell
        blocks={localBlocks}
        document={document}
        errorMessage={error}
        isArchiving={isArchiving}
        isPublishing={isPublishing}
        isRenaming={isRenaming}
        isRestoring={isRestoring}
        isSaving={isSaving}
        onAddBlock={appendBlock}
        onArchive={() => archiveDocument()}
        onPublish={() => publishDocument()}
        onRemoveBlock={removeBlock}
        onRename={(title) => {
          void renameDocument({ title });
        }}
        onRestore={() => restoreDocument()}
        onSaveBlocks={() => saveBlocks()}
        onUpdateBlock={updateBlockContent}
      />
    </div>
  );
}
