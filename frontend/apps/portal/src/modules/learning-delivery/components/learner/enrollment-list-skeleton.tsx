import { Card, Skeleton } from '@mentrily/ui-system';

interface EnrollmentListSkeletonProps {
  count?: number;
}

export function EnrollmentListSkeleton({
  count = 3,
}: EnrollmentListSkeletonProps) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index}>
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-3 h-4 w-40" />
          <Skeleton className="mt-4 h-10 w-28" />
        </Card>
      ))}
    </div>
  );
}
