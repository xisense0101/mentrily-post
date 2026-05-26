'use client';

import type { ProctoringAttemptMonitoringSummaryContract } from '@mentrily/domain-contracts';

export function ActiveMonitoringTable({
  summary,
}: {
  summary: ProctoringAttemptMonitoringSummaryContract;
}) {
  if (summary.sessions.length === 0) {
    return <p data-testid="active-monitoring-empty">No active monitored attempts.</p>;
  }

  return (
    <div className="overflow-x-auto" data-testid="active-monitoring-table">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="pb-2 pr-4">Attempt</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Mode</th>
            <th className="pb-2 pr-4">Warnings</th>
            <th className="pb-2">High severity</th>
          </tr>
        </thead>
        <tbody>
          {summary.sessions.map(
            (session: ProctoringAttemptMonitoringSummaryContract['sessions'][number]) => (
              <tr key={session.sessionId} className="border-t border-slate-200">
                <td className="py-2 pr-4">{session.attemptId}</td>
                <td className="py-2 pr-4">{session.status}</td>
                <td className="py-2 pr-4">{session.mode}</td>
                <td className="py-2 pr-4">{session.warningEvents}</td>
                <td className="py-2">{session.highSeverityEvents}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
