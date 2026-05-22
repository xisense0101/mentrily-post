import { Skeleton } from '@mentrily/ui-system';

export function NotificationSkeleton() {
  return (
    <div className="grid gap-4" data-testid="notification-skeleton">
      {[0, 1, 2].map((key) => (
        <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5" key={key}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-6 w-3/4" />
          <Skeleton className="mt-3 h-16 w-full" />
          <Skeleton className="mt-4 h-10 w-48" />
        </div>
      ))}
    </div>
  );
}
