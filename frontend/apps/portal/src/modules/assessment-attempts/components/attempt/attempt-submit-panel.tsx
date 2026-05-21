interface AttemptSubmitPanelProps {
  editable: boolean;
  statusLabel: string;
  submitting: boolean;
  cancelling: boolean;
  submitError?: string | undefined;
  isOffline?: boolean | undefined;
  wasOffline?: boolean | undefined;
  onSubmit: () => Promise<void> | void;
  onCancel: () => Promise<void> | void;
}

export function AttemptSubmitPanel({
  editable,
  statusLabel,
  submitting,
  cancelling,
  submitError,
  isOffline,
  wasOffline,
  onSubmit,
  onCancel,
}: AttemptSubmitPanelProps) {
  return (
    <section className="rounded-[1.75rem] border border-portal-border bg-white/90 p-6 shadow-portal-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">
        Attempt actions
      </p>
      <h3 className="mt-3 text-xl font-semibold text-portal-text">Submission</h3>
      <p className="mt-2 text-sm leading-6 text-portal-text-muted">
        Current attempt state: {statusLabel}. Submission creates a result placeholder only.
      </p>
      {isOffline ? (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Connection lost. Saving and submission are disabled until you reconnect.
        </p>
      ) : null}
      {wasOffline && !isOffline ? (
        <p className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Connection restored. Review your answers and retry manually when ready.
        </p>
      ) : null}
      {submitError ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-portal-text px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="attempt-submit-button"
          disabled={!editable || submitting || isOffline}
          onClick={() => void onSubmit()}
          type="button"
        >
          {submitting ? 'Submitting...' : 'Submit attempt'}
        </button>
        <button
          className="rounded-full border border-portal-border bg-white px-5 py-3 text-sm font-semibold text-portal-text transition hover:bg-portal-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!editable || cancelling || isOffline}
          onClick={() => void onCancel()}
          type="button"
        >
          {cancelling ? 'Cancelling...' : 'Cancel attempt'}
        </button>
      </div>
    </section>
  );
}
