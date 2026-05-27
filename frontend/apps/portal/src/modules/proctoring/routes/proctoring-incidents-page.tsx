'use client';

import { useEffect, useState } from 'react';
import type {
  ProctoringIncidentContract,
  ProctoringIncidentSeverityContract,
  ProctoringIncidentStatusContract,
  ProctoringIncidentSummaryContract,
} from '@mentrily/domain-contracts';
import { proctoringApiClient } from '../api/proctoring-api-client';
import { IncidentList } from '../components/incident-list';
import { IncidentSummaryCards } from '../components/incident-summary-cards';

const STATUS_OPTIONS: Array<{ label: string; value: ProctoringIncidentStatusContract | '' }> = [
  { label: 'All Statuses', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Review', value: 'IN_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Dismissed', value: 'DISMISSED' },
  { label: 'Escalated', value: 'ESCALATED' },
];

const SEVERITY_OPTIONS: Array<{ label: string; value: ProctoringIncidentSeverityContract | '' }> = [
  { label: 'All Severities', value: '' },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

export function ProctoringIncidentsPage() {
  const [incidents, setIncidents] = useState<ProctoringIncidentContract[]>([]);
  const [summary, setSummary] = useState<ProctoringIncidentSummaryContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ProctoringIncidentStatusContract | ''>('');
  const [severityFilter, setSeverityFilter] = useState<ProctoringIncidentSeverityContract | ''>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      proctoringApiClient.listProctoringIncidents({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      }),
      proctoringApiClient.getProctoringIncidentSummary().catch(() => null),
    ])
      .then(([listResponse, summaryResponse]) => {
        if (cancelled) return;
        setIncidents(listResponse.incidents);
        setSummary(summaryResponse);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Failed to load proctoring incidents.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [statusFilter, severityFilter]);

  return (
    <div className="portal-page space-y-8" data-testid="proctoring-incidents-page">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Proctoring
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Incident Triage</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review monitoring incidents. Incidents are metadata-only and do not constitute automatic
          proof of any misconduct.
        </p>
      </header>

      {summary ? <IncidentSummaryCards summary={summary} /> : null}

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label
            htmlFor="filter-status"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ProctoringIncidentStatusContract | '')
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            data-testid="filter-status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="filter-severity"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Severity
          </label>
          <select
            id="filter-severity"
            value={severityFilter}
            onChange={(e) =>
              setSeverityFilter(e.target.value as ProctoringIncidentSeverityContract | '')
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            data-testid="filter-severity"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500" data-testid="proctoring-incidents-loading">
          Loading incidents…
        </p>
      ) : error ? (
        <p className="text-red-600" role="alert" data-testid="proctoring-incidents-error">
          {error}
        </p>
      ) : (
        <IncidentList incidents={incidents} />
      )}
    </div>
  );
}
