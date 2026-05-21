import { EmptyState } from '@mentrily/ui-system';

export function EnrollmentEmptyState() {
  return (
    <div data-testid="learning-empty-state">
      <EmptyState
        title="No enrollments yet"
        description="Enroll in a published course to start tracking progress here."
      />
    </div>
  );
}
