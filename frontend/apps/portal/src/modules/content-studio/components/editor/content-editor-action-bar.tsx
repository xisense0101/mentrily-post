import { Button, Card } from '@mentrily/ui-system';
import type { ContentDocumentContract } from '../../types';

interface ContentEditorActionBarProps {
  document: ContentDocumentContract;
  isSaving?: boolean;
  isPublishing?: boolean;
  isArchiving?: boolean;
  isRestoring?: boolean;
  onSaveBlocks: () => Promise<void> | void;
  onPublish: () => Promise<void> | void;
  onArchive: () => Promise<void> | void;
  onRestore: () => Promise<void> | void;
}

export function ContentEditorActionBar({
  document,
  isSaving = false,
  isPublishing = false,
  isArchiving = false,
  isRestoring = false,
  onSaveBlocks,
  onPublish,
  onArchive,
  onRestore,
}: ContentEditorActionBarProps) {
  const isArchived = document.status === 'ARCHIVED';

  return (
    <Card
      className="sticky top-4 flex flex-wrap items-center gap-3"
      data-testid="content-editor-action-bar"
    >
      <div data-testid="content-save-blocks-button">
        <Button disabled={isSaving || isArchived} onClick={onSaveBlocks} variant="secondary">
          {isSaving ? 'Saving draft...' : 'Save draft'}
        </Button>
      </div>
      <div data-testid="content-publish-button">
        <Button disabled={isPublishing || isArchived} onClick={onPublish}>
          {isPublishing ? 'Publishing...' : 'Publish'}
        </Button>
      </div>
      <div data-testid="content-archive-button">
        <Button disabled={isArchiving || isArchived} onClick={onArchive} variant="danger">
          {isArchiving ? 'Archiving...' : 'Archive'}
        </Button>
      </div>
      {isArchived ? (
        <div data-testid="content-restore-button">
          <Button disabled={isRestoring} onClick={onRestore} variant="secondary">
            {isRestoring ? 'Restoring...' : 'Restore'}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
