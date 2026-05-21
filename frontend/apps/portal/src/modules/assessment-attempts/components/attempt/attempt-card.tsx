import Link from 'next/link';
import type { AssessmentAttemptContract } from '../../types';
import { AttemptStatusBadge } from './attempt-status-badge';

export function AttemptCard({ attempt }: { attempt: AssessmentAttemptContract }) {
  const isEditable = attempt.status === 'IN_PROGRESS' || attempt.status === 'NOT_STARTED';

  return (
    <article
      className="rounded-[1.75rem] border border-portal-border bg-white/90 p-5 shadow-portal-sm"
      data-testid="attempt-card"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">
            Assessment attempt
          </p>
          <h3 className="mt-2 text-lg font-semibold text-portal-text">{attempt.assessmentId}</h3>
          <p className="mt-2 text-sm text-portal-text-muted">
            Started {new Date(attempt.startedAt).toLocaleString()}
          </p>
        </div>
        <AttemptStatusBadge status={attempt.status} />
      </div>
      <div className="mt-5">
        <Link
          className="inline-flex rounded-full border border-portal-border bg-white px-4 py-2 text-sm font-medium text-portal-text shadow-sm transition hover:bg-portal-surface-muted"
          href={`/attempts/${attempt.id}`}
        >
          {isEditable ? 'Resume attempt' : 'Review attempt'}
        </Link>
      </div>
    </article>
  );
}
