import type { AssessmentAttemptStatusContract } from '../../types';

const statusLabelMap: Record<AssessmentAttemptStatusContract, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

const statusClassMap: Record<AssessmentAttemptStatusContract, string> = {
  NOT_STARTED: 'border-slate-200 bg-slate-100 text-slate-700',
  IN_PROGRESS: 'border-sky-200 bg-sky-100 text-sky-700',
  SUBMITTED: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  EXPIRED: 'border-amber-200 bg-amber-100 text-amber-700',
  CANCELLED: 'border-rose-200 bg-rose-100 text-rose-700',
};

export function AttemptStatusBadge({ status }: { status: AssessmentAttemptStatusContract }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClassMap[status]}`}
      data-testid="attempt-status-badge"
    >
      {statusLabelMap[status]}
    </span>
  );
}
