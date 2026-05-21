import { Skeleton } from '@mentrily/ui-system';

export function AssessmentListSkeleton() {
  return (
    <div
      className="grid gap-4"
      data-testid="assessment-list-skeleton"
      aria-busy="true"
      aria-label="Loading assessments"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton className="h-32 w-full" key={index} />
      ))}
    </div>
  );
}
