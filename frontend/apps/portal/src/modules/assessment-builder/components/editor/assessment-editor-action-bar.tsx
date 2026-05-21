import { Button } from '@mentrily/ui-system';
import type { AssessmentStatusContract } from '../../types';

interface AssessmentEditorActionBarProps {
  status: AssessmentStatusContract;
  isSaving?: boolean | undefined;
  isPublishing?: boolean | undefined;
  isArchiving?: boolean | undefined;
  isRestoring?: boolean | undefined;
  onSave?: (() => void) | undefined;
  onPublish?: (() => void) | undefined;
  onArchive?: (() => void) | undefined;
  onRestore?: (() => void) | undefined;
}

export function AssessmentEditorActionBar({
  status,
  isSaving,
  isPublishing,
  isArchiving,
  isRestoring,
  onSave,
  onPublish,
  onArchive,
  onRestore,
}: AssessmentEditorActionBarProps) {
  const isArchived = status === 'ARCHIVED';
  const isDraft = status === 'DRAFT';

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="assessment-editor-action-bar">
      {!isArchived ? (
        <div data-testid="assessment-save-content-button">
          <Button
            data-testid="save-draft-button"
            disabled={isSaving}
            onClick={onSave}
            type="button"
            variant="secondary"
          >
            {isSaving ? 'Saving...' : 'Save draft'}
          </Button>
        </div>
      ) : null}

      {isDraft ? (
        <div data-testid="assessment-publish-button">
          <Button
            data-testid="publish-button"
            disabled={isPublishing}
            onClick={onPublish}
            type="button"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      ) : null}

      {!isArchived ? (
        <div data-testid="assessment-archive-button">
          <Button
            data-testid="archive-button"
            disabled={isArchiving}
            onClick={onArchive}
            type="button"
            variant="danger"
          >
            {isArchiving ? 'Archiving...' : 'Archive'}
          </Button>
        </div>
      ) : null}

      {isArchived ? (
        <div data-testid="assessment-restore-button">
          <Button
            data-testid="restore-button"
            disabled={isRestoring}
            onClick={onRestore}
            type="button"
            variant="secondary"
          >
            {isRestoring ? 'Restoring...' : 'Restore'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
