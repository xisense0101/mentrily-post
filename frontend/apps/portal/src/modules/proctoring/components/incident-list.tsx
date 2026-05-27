'use client';

import Link from 'next/link';
import type { ProctoringIncidentContract } from '@mentrily/domain-contracts';
import { IncidentStatusBadge } from './incident-status-badge';
import { IncidentSeverityBadge } from './incident-severity-badge';

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

export function IncidentList({ incidents }: { incidents: ProctoringIncidentContract[] }) {
  if (incidents.length === 0) {
    return (
      <p className="py-12 text-center text-slate-500" data-testid="incident-list-empty">
        No incidents found for the selected filters.
      </p>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-2xl border border-slate-200"
      data-testid="incident-list"
    >
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Events</th>
            <th className="px-4 py-3">First Event</th>
            <th className="px-4 py-3">Last Event</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {incidents.map((incident) => (
            <tr
              key={incident.id}
              className="transition-colors hover:bg-slate-50"
              data-testid={`incident-row-${incident.id}`}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/proctoring/incidents/${incident.id}`}
                  className="font-medium text-slate-800 hover:text-blue-600 hover:underline"
                  data-testid={`incident-link-${incident.id}`}
                >
                  {incident.title}
                </Link>
                {incident.learnerDisplayName ? (
                  <p className="mt-0.5 text-xs text-slate-400">{incident.learnerDisplayName}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {incident.incidentType.replace(/_/g, ' ')}
              </td>
              <td className="px-4 py-3">
                <IncidentSeverityBadge severity={incident.severity} />
              </td>
              <td className="px-4 py-3">
                <IncidentStatusBadge status={incident.status} />
              </td>
              <td className="px-4 py-3 text-slate-600">{incident.eventCount}</td>
              <td className="px-4 py-3 text-slate-500">{formatDate(incident.firstEventAt)}</td>
              <td className="px-4 py-3 text-slate-500">{formatDate(incident.lastEventAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
