'use client';

import type { ProctoringIncidentReviewActionContract } from '@mentrily/domain-contracts';

const ACTION_LABELS: Record<string, string> = {
  OPENED: 'Incident opened',
  MARKED_IN_REVIEW: 'Marked as In Review',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
  ESCALATED: 'Escalated',
  REOPENED: 'Reopened',
  NOTE_ADDED: 'Note added',
};

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

export function IncidentReviewActions({
  actions,
  currentStatus,
  submitting,
  onMarkInReview,
  onResolve,
  onDismiss,
  onEscalate,
}: {
  actions: ProctoringIncidentReviewActionContract[];
  currentStatus: string;
  submitting: boolean;
  onMarkInReview: () => void;
  onResolve: () => void;
  onDismiss: () => void;
  onEscalate: () => void;
}) {
  return (
    <div className="space-y-6" data-testid="incident-review-actions">
      <div className="flex flex-wrap gap-3">
        <button
          id="btn-mark-in-review"
          type="button"
          disabled={submitting || currentStatus === 'IN_REVIEW'}
          onClick={onMarkInReview}
          className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 transition-colors hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="btn-mark-in-review"
        >
          Mark In Review
        </button>
        <button
          id="btn-resolve"
          type="button"
          disabled={submitting || currentStatus === 'RESOLVED'}
          onClick={onResolve}
          className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="btn-resolve"
        >
          Resolve
        </button>
        <button
          id="btn-dismiss"
          type="button"
          disabled={submitting || currentStatus === 'DISMISSED'}
          onClick={onDismiss}
          className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="btn-dismiss"
        >
          Dismiss
        </button>
        <button
          id="btn-escalate"
          type="button"
          disabled={submitting || currentStatus === 'ESCALATED'}
          onClick={onEscalate}
          className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-800 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="btn-escalate"
        >
          Escalate
        </button>
      </div>

      {actions.length > 0 ? (
        <div data-testid="incident-review-action-history">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Review History
          </h3>
          <ul className="space-y-2">
            {actions.map((action) => (
              <li
                key={action.id}
                className="rounded-xl border border-slate-100 bg-white p-3 text-sm"
                data-testid={`review-action-${action.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700">
                    {ACTION_LABELS[action.actionType] ?? action.actionType}
                  </span>
                  {action.actorDisplayName ? (
                    <span className="text-xs text-slate-400">by {action.actorDisplayName}</span>
                  ) : null}
                </div>
                {action.note ? <p className="mt-1 text-slate-600">{action.note}</p> : null}
                <p className="mt-1 text-xs text-slate-400">{formatDate(action.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
