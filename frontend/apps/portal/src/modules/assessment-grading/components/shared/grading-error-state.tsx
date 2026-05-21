interface GradingErrorStateProps {
  message: string;
  onRetry?: (() => void) | undefined;
}

export function GradingErrorState({ message, onRetry }: GradingErrorStateProps) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700" data-testid="grading-error-state">
      <p className="text-sm font-medium">{message}</p>
      {onRetry ? (
        <button className="mt-3 rounded-xl border border-rose-300 px-3 py-2 text-xs" onClick={onRetry} type="button">
          Retry
        </button>
      ) : null}
    </div>
  );
}
