'use client';

import { useEffect, useState } from 'react';
import type {
  ProctoringAttemptMonitoringSummaryContract,
  ProctoringAttemptMonitoringTimelineContract,
} from '@mentrily/domain-contracts';
import { proctoringApiClient } from '../api/proctoring-api-client';
import { ActiveMonitoringTable } from '../components/active-monitoring-table';
import { MonitoringTimeline } from '../components/monitoring-timeline';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      proctoringApiClient.getAttemptMonitoringTimeline(attemptId),
      proctoringApiClient.getActiveAssessmentMonitoring(assessmentId).catch(() => null),
    ])
      .then(([nextTimeline, nextActive]) => {
        if (cancelled) {
          return;
        }
        setTimeline(nextTimeline);
        setActiveSummary(nextActive);
        setError(null);
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
      {!loading && !error && activeSummary ? (
        <ActiveMonitoringTable summary={activeSummary} />
      ) : null}
      {!loading && !error && timeline ? <MonitoringTimeline timeline={timeline} /> : null}
    </div>
  );
}
