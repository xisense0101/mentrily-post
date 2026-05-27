'use client';

import Link from 'next/link';
import { IncidentDetail } from '../components/incident-detail';

export function ProctoringIncidentDetailPage({ incidentId }: { incidentId: string }) {
  return (
    <div className="portal-page space-y-6" data-testid="proctoring-incident-detail-page">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Proctoring
        </p>
        <nav
          aria-label="Breadcrumb"
          className="mt-1 flex items-center gap-1 text-sm text-slate-500"
        >
          <Link href="/proctoring/incidents" className="hover:text-slate-700 hover:underline">
            Incident Triage
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-700">Incident Detail</span>
        </nav>
      </header>
      <IncidentDetail incidentId={incidentId} />
    </div>
  );
}
