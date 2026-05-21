import { Card, Skeleton } from '@mentrily/ui-system';

interface CourseListSkeletonProps {
  count?: number;
}

export function CourseListSkeleton({ count = 3 }: CourseListSkeletonProps) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index}>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-3 h-4 w-32" />
          <div className="mt-5 grid gap-2 md:grid-cols-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}
