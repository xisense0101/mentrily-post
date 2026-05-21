import type { AssessmentAttemptAnswerStatusContract } from '../../types';

export function AttemptAnswerStatusBadge({
  status,
}: {
  status: AssessmentAttemptAnswerStatusContract;
}) {
  const tone =
    status === 'SUBMITTED'
      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
      : 'border-slate-200 bg-slate-100 text-slate-700';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}
    >
      {status === 'SUBMITTED' ? 'Submitted answer' : 'Draft answer'}
    </span>
  );
}
