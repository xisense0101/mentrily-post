import { EmptyState } from '@mentrily/ui-system';

export function CourseEmptyState() {
  return (
    <div data-testid="learning-empty-state">
      <EmptyState
        title="No learning courses yet"
        description="Create the first draft course for this workspace to start building a learning catalog."
      />
    </div>
  );
}
