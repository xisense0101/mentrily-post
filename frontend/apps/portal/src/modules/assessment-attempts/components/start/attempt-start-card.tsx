interface AttemptStartCardProps {
  assessmentId: string;
  isStarting: boolean;
  errorMessage?: string | null | undefined;
  onStart: () => Promise<void> | void;
}

export function AttemptStartCard({
  assessmentId,
  isStarting,
  errorMessage,
  onStart,
}: AttemptStartCardProps) {
  return (
    <section
      className="rounded-[2rem] border border-portal-border bg-white/90 p-8 shadow-portal-lg"
      data-testid="attempt-start-page"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">
        Learner attempt
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-portal-text">Start assessment attempt</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-portal-text-muted">
        This starts a learner-owned attempt from the published assessment snapshot. Draft builder
        content is not used here.
      </p>
      <dl className="mt-6 grid gap-4 rounded-3xl border border-portal-border bg-portal-surface-muted p-5 text-sm text-portal-text-muted md:grid-cols-2">
        <div>
          <dt className="font-semibold text-portal-text">Assessment ID</dt>
          <dd className="mt-1 break-all">{assessmentId}</dd>
        </div>
        <div>
          <dt className="font-semibold text-portal-text">Attempt mode</dt>
          <dd className="mt-1">Published snapshot only</dd>
        </div>
      </dl>
      {errorMessage ? (
        <p className="mt-5 text-sm text-rose-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="mt-6">
        <button
          className="rounded-full bg-portal-text px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="attempt-start-button"
          disabled={isStarting}
          onClick={() => void onStart()}
          type="button"
        >
          {isStarting ? 'Starting...' : 'Start attempt'}
        </button>
      </div>
    </section>
  );
}
