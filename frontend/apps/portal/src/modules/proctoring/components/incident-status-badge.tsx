'use client';

import type { ProctoringIncidentStatusContract } from '@mentrily/domain-contracts';

const STATUS_CONFIG: Record<
  ProctoringIncidentStatusContract,
  { label: string; className: string }
> = {
  OPEN: {
    label: 'Open',
    className:
      'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700',
  },
  IN_REVIEW: {
    label: 'In Review',
    className:
      'inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700',
  },
  RESOLVED: {
    label: 'Resolved',
    className:
      'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700',
  },
  DISMISSED: {
    label: 'Dismissed',
    className:
      'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600',
  },
  ESCALATED: {
    label: 'Escalated',
    className:
      'inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700',
  },
};

export function IncidentStatusBadge({ status }: { status: ProctoringIncidentStatusContract }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className:
      'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500',
  };
  return (
    <span className={config.className} data-testid="incident-status-badge">
      {config.label}
    </span>
  );
}
