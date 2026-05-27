'use client';

import type { ProctoringIncidentSeverityContract } from '@mentrily/domain-contracts';

const SEVERITY_CONFIG: Record<
  ProctoringIncidentSeverityContract,
  { label: string; className: string }
> = {
  LOW: {
    label: 'Low',
    className:
      'inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-600',
  },
  MEDIUM: {
    label: 'Medium',
    className:
      'inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700',
  },
  HIGH: {
    label: 'High',
    className:
      'inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700',
  },
  CRITICAL: {
    label: 'Critical',
    className:
      'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700',
  },
};

export function IncidentSeverityBadge({
  severity,
}: {
  severity: ProctoringIncidentSeverityContract;
}) {
  const config = SEVERITY_CONFIG[severity] ?? {
    label: severity,
    className:
      'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500',
  };
  return (
    <span className={config.className} data-testid="incident-severity-badge">
      {config.label}
    </span>
  );
}
