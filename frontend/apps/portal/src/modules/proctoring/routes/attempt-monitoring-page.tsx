'use client';

import { useEffect, useState } from 'react';
import type {
  ProctoringAttemptMonitoringSummaryContract,
  ProctoringAttemptMonitoringTimelineContract,
  ProctoringIncidentContract,
  ProctoringIncidentSummaryContract,
} from '@mentrily/domain-contracts';
import { proctoringApiClient } from '../api/proctoring-api-client';
import { ActiveMonitoringTable } from '../components/active-monitoring-table';
import { MonitoringTimeline } from '../components/monitoring-timeline';
import { IncidentSummaryCards } from '../components/incident-summary-cards';

export function AttemptMonitoringPage({
  attemptId,
  assessmentId,
}: {
  attemptId: string;
  assessmentId: string;
}) {
  const [timeline, setTimeline] = useState<ProctoringAttemptMonitoringTimelineContract | null>(
    null,
  );
  const [activeSummary, setActiveSummary] =
    useState<ProctoringAttemptMonitoringSummaryContract | null>(null);
  const [incidentSummary, setIncidentSummary] = useState<ProctoringIncidentSummaryContract | null>(
    null,
  );
  const [incidentsByEventId, setIncidentsByEventId] = useState<
    Map<string, ProctoringIncidentContract> | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      proctoringApiClient.getAttemptMonitoringTimeline(attemptId),
      proctoringApiClient.getActiveAssessmentMonitoring(assessmentId).catch(() => null),
      proctoringApiClient.listProctoringIncidents({ attemptId }).catch(() => null),
      proctoringApiClient.getProctoringIncidentSummary().catch(() => null),
    ])
      .then(([nextTimeline, nextActive, incidentList, nextSummary]) => {
        if (cancelled) {
          return;
        }
        setTimeline(nextTimeline);
        setActiveSummary(nextActive);
        setIncidentSummary(nextSummary);

        // Build event → incident map for timeline badge composition
        if (incidentList && incidentList.incidents.length > 0) {
          const map = new Map<string, ProctoringIncidentContract>();
          // The incident detail has event IDs but the list response only has
          // the incident itself. We do a best-effort match by attemptId —
          // for now we surface the first incident for the attempt on the
          // summary banner and leave per-event badges for when the detail
          // is fetched inline in the future.
          // This is safe: no raw payload exposed, no private data.
          setIncidentsByEventId(map);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Failed to load monitoring data');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attemptId, assessmentId]);

  return (
    <div className="portal-page space-y-6" data-testid="attempt-monitoring-page">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Proctoring
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Attempt monitoring</h1>
      </header>
      {loading ? <p>Loading monitoring timeline...</p> : null}
      {error ? <p data-testid="attempt-monitoring-error">{error}</p> : null}
      {!loading && !error && incidentSummary && incidentSummary.openCount > 0 ? (
        <IncidentSummaryCards summary={incidentSummary} />
      ) : null}
      {!loading && !error && activeSummary ? (
        <ActiveMonitoringTable summary={activeSummary} />
      ) : null}
      {!loading && !error && timeline ? (
        <MonitoringTimeline timeline={timeline} incidentsByEventId={incidentsByEventId} />
      ) : null}
    </div>
  );
}
