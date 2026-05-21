import type { ContentBlockContract, ContentDocumentContract } from '../../types';
import { BlockCreateToolbar, BlockList } from '../blocks';
import { ContentErrorState } from '../shared';
import { ContentEditorActionBar } from './content-editor-action-bar';
import { ContentEditorHeader } from './content-editor-header';
import { ContentPublishPanel } from './content-publish-panel';

interface ContentEditorShellProps {
  document: ContentDocumentContract;
  blocks: ContentBlockContract[];
  errorMessage?: string | null;
  isArchiving?: boolean;
  isPublishing?: boolean;
  isRenaming?: boolean;
  isRestoring?: boolean;
  isSaving?: boolean;
  onAddBlock: (kind: ContentBlockContract['kind']) => void;
  onArchive: () => Promise<void> | void;
  onPublish: () => Promise<void> | void;
  onRename: (title: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onRestore: () => Promise<void> | void;
  onSaveBlocks: () => Promise<void> | void;
  onUpdateBlock: (blockId: string, content: Record<string, unknown>) => void;
}

export function ContentEditorShell({
  document,
  blocks,
  errorMessage,
  isArchiving = false,
  isPublishing = false,
  isRenaming = false,
  isRestoring = false,
  isSaving = false,
  onAddBlock,
  onArchive,
  onPublish,
  onRename,
  onRemoveBlock,
  onRestore,
  onSaveBlocks,
  onUpdateBlock,
}: ContentEditorShellProps) {
  return (
    <div className="space-y-6" data-testid="content-editor-shell">
      <ContentEditorHeader document={document} isPending={isRenaming} onRename={onRename} />
      <ContentEditorActionBar
        document={document}
        isArchiving={isArchiving}
        isPublishing={isPublishing}
        isRestoring={isRestoring}
        isSaving={isSaving}
        onArchive={onArchive}
        onPublish={onPublish}
        onRestore={onRestore}
        onSaveBlocks={onSaveBlocks}
      />
      {errorMessage ? <ContentErrorState message={errorMessage} /> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4 rounded-[2rem] border border-portal-border bg-white/75 p-4 shadow-portal-sm backdrop-blur">
          <BlockCreateToolbar onAddBlock={onAddBlock} />
          <BlockList
            blocks={blocks}
            editable={document.status !== 'ARCHIVED'}
            onChange={onUpdateBlock}
            onRemove={onRemoveBlock}
          />
        </div>
        <ContentPublishPanel blockCount={blocks.length} document={document} />
      </div>
    </div>
  );
}
