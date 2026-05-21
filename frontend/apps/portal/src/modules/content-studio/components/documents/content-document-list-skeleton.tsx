import { Card, Skeleton } from '@mentrily/ui-system';

export function ContentDocumentListSkeleton() {
  return (
    <div className="grid gap-4" data-testid="content-document-list-skeleton">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card className="space-y-3" key={index}>
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      ))}
    </div>
  );
}
