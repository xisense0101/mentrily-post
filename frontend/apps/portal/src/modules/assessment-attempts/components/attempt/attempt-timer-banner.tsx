interface AttemptTimerBannerProps {
  expiresAt?: string | undefined;
  remainingLabel?: string | undefined;
  severity?: 'normal' | 'warning' | 'urgent' | 'expired' | null | undefined;
}

export function AttemptTimerBanner({
  expiresAt,
  remainingLabel,
  severity,
}: AttemptTimerBannerProps) {
  if (!expiresAt) {
    return null;
  }

  const palette =
    severity === 'expired'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : severity === 'urgent'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : severity === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-sky-200 bg-sky-50 text-sky-800';

  return (
    <div
      className={`rounded-3xl border px-5 py-4 text-sm shadow-sm ${palette}`}
      data-testid="attempt-timer-banner"
    >
      <p className="font-semibold">
        {severity === 'expired'
          ? 'Time expired'
          : severity === 'urgent'
            ? 'Less than one minute remaining'
            : severity === 'warning'
              ? 'Less than five minutes remaining'
              : 'Timed attempt'}
      </p>
      <p className="mt-1">
        Expires at {new Date(expiresAt).toLocaleString()}
        {remainingLabel ? ` • ${remainingLabel} left` : '.'}
      </p>
    </div>
  );
}
