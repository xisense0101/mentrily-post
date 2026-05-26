'use client';

import type { ProctoringAttemptMonitoringTimelineContract } from '@mentrily/domain-contracts';

export function MonitoringTimeline({
  timeline,
}: {
  timeline: ProctoringAttemptMonitoringTimelineContract;
}) {
  if (timeline.events.length === 0) {
    return <p data-testid="monitoring-timeline-empty">No monitoring events have been recorded.</p>;
  }

  return (
    <ul className="space-y-3" data-testid="monitoring-timeline">
      {timeline.events.map(
        (event: ProctoringAttemptMonitoringTimelineContract['events'][number]) => (
          <li key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{event.message}</strong>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {event.eventType}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {event.severity}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Occurred at {new Date(event.occurredAt).toLocaleString()}
            </p>
            {Object.keys(event.metadataSummary).length > 0 ? (
              <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(event.metadataSummary, null, 2)}
              </pre>
            ) : null}
          </li>
        ),
      )}
    </ul>
  );
}
