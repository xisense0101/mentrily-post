interface AttemptProgressPanelProps {
  answeredCount: number;
  totalCount: number;
  contextCount?: number | undefined;
}

export function AttemptProgressPanel({
  answeredCount,
  totalCount,
  contextCount = 0,
}: AttemptProgressPanelProps) {
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <section
      className="rounded-[1.75rem] border border-portal-border bg-white/90 p-6 shadow-portal-sm"
      data-testid="attempt-progress-panel"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">
        Progress
      </p>
      <p className="mt-3 text-3xl font-semibold text-portal-text">
        {answeredCount}
        <span className="text-lg text-portal-text-muted"> / {totalCount}</span>
      </p>
      <p className="mt-2 text-sm text-portal-text-muted">{progress}% of questions answered</p>
      {contextCount > 0 ? (
        <p className="mt-2 text-xs text-portal-text-muted">
          {contextCount} reading passage {contextCount === 1 ? 'item is' : 'items are'} treated as
          context and excluded from progress.
        </p>
      ) : null}
      <div className="mt-4 h-2 rounded-full bg-portal-surface-muted">
        <div
          className="h-2 rounded-full bg-portal-accent transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}
