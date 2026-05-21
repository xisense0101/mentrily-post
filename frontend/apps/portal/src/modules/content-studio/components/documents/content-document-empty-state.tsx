import { EmptyState } from '@mentrily/ui-system';

export function ContentDocumentEmptyState() {
  return (
    <div data-testid="content-empty-state">
      <EmptyState
        className="min-h-[18rem] content-center"
        title="No content documents yet"
        description="Create the first draft document to start the Content Studio authoring flow."
      />
    </div>
  );
}
