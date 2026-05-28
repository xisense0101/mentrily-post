'use client';

import type { ProctoringAttemptSummaryContract } from '@mentrily/domain-contracts';

export function ProctoringStatusBadge({
  summary,
  status,
}: {
  summary: ProctoringAttemptSummaryContract;
  status?: 'idle' | 'starting' | 'active' | 'blocked' | 'error';
}) {
  const label =
    summary.mode === 'OFF'
      ? 'Monitoring off'
      : status === 'error'
        ? 'Monitoring issue'
        : status === 'starting'
          ? 'Monitoring starting'
          : status === 'blocked'
            ? 'Monitoring gated'
            : 'Monitoring visible';

  const tones =
    summary.mode === 'OFF'
      ? 'border-slate-200 bg-slate-50 text-slate-700'
      : status === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : status === 'blocked'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tones}`}
      data-testid="proctoring-status-badge"
    >
      {label}
    </span>
  );
}
