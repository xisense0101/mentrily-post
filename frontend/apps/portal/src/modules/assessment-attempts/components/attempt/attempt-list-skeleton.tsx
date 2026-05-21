export function AttemptListSkeleton() {
  return (
    <div className="grid gap-4" data-testid="attempt-list-skeleton">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="h-36 animate-pulse rounded-[1.75rem] border border-portal-border bg-white/70"
          key={index}
        />
      ))}
    </div>
  );
}
