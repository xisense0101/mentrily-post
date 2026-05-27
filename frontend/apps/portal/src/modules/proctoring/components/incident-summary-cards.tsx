'use client';

import type { ProctoringIncidentSummaryContract } from '@mentrily/domain-contracts';

export function IncidentSummaryCards({ summary }: { summary: ProctoringIncidentSummaryContract }) {
  const cards = [
    {
      id: 'open-incidents',
      label: 'Open Incidents',
      value: summary.openCount,
      className: 'border-red-200 bg-red-50 text-red-700',
    },
    {
      id: 'high-severity-incidents',
      label: 'High Severity',
      value: summary.highSeverityCount,
      className: 'border-orange-200 bg-orange-50 text-orange-700',
    },
    {
      id: 'in-review-incidents',
      label: 'Under Review',
      value: summary.inReviewCount,
      className: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    },
    {
      id: 'resolved-dismissed-incidents',
      label: 'Resolved / Dismissed',
      value: summary.resolvedDismissedCount,
      className: 'border-green-200 bg-green-50 text-green-700',
    },
    {
      id: 'attempts-with-incidents',
      label: 'Attempts Flagged',
      value: summary.attemptsWithIncidentsCount,
      className: 'border-slate-200 bg-slate-50 text-slate-700',
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
      data-testid="incident-summary-cards"
    >
      {cards.map((card) => (
        <div
          key={card.id}
          id={card.id}
          className={`rounded-2xl border p-4 ${card.className}`}
          data-testid={card.id}
        >
          <p className="text-3xl font-bold">{card.value}</p>
          <p className="mt-1 text-xs font-medium">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
