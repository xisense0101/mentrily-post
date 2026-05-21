import type { AssessmentAttemptResultContract } from '../../types';

interface AttemptResultPlaceholderProps {
  result?: AssessmentAttemptResultContract | undefined;
}

export function AttemptResultPlaceholder({ result }: AttemptResultPlaceholderProps) {
  return (
    <section
      className="rounded-[1.75rem] border border-portal-border bg-white/90 p-6 shadow-portal-sm"
      data-testid="attempt-result-placeholder"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">
        Result status
      </p>
      <h3 className="mt-3 text-xl font-semibold text-portal-text">Result placeholder</h3>
      <p className="mt-2 text-sm leading-6 text-portal-text-muted">
        Grading runtime and result release are not implemented yet. This placeholder confirms
        submission state only.
      </p>
      <dl className="mt-4 grid gap-3 text-sm text-portal-text-muted sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-portal-text">Grading status</dt>
          <dd className="mt-1">{result?.gradingStatus ?? 'NOT_GRADED'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-portal-text">Released</dt>
          <dd className="mt-1">{result?.releasedAt ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
    </section>
  );
}
