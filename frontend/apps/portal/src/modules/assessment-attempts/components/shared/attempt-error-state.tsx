interface AttemptErrorStateProps {
  message: string;
  title?: string | undefined;
  onRetry?: (() => void) | undefined;
}

export function AttemptErrorState({ message, title, onRetry }: AttemptErrorStateProps) {
  return (
    <div
      className="rounded-3xl border border-rose-200 bg-rose-50/95 p-8 text-center shadow-sm"
      data-testid="attempt-error-state"
      role="alert"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-rose-600 shadow-sm">
        !
      </div>
      <h3 className="text-lg font-semibold text-rose-900">{title ?? 'Something went wrong'}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700">{message}</p>
      {onRetry ? (
        <div className="mt-5 flex justify-center">
          <button
            className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
