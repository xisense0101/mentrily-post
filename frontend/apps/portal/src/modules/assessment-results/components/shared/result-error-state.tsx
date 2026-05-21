export function ResultErrorState({ message, onRetry }: { message: string; onRetry?: (() => void) | undefined }) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700" data-testid="result-error-state">
      <p className="font-semibold">Result unavailable</p>
      <p className="mt-2">{message}</p>
      {onRetry ? <button className="mt-4 rounded-full border border-rose-300 px-4 py-2" onClick={onRetry} type="button">Retry</button> : null}
    </div>
  );
}
