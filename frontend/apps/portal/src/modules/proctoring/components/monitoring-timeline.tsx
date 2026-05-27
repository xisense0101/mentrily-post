'use client';

import Link from 'next/link';
import type {
  ProctoringAttemptMonitoringTimelineContract,
  ProctoringIncidentContract,
} from '@mentrily/domain-contracts';

/**
 * A safe, minimal incident link badge shown beside a timeline event when that
 * event is linked to a known incident. The badge renders only the incident
 * severity and a link to the detail page. No raw event payload, private
 * grading data, or unreleased scores are exposed.
 */
function IncidentBadge({ incident }: { incident: ProctoringIncidentContract }) {
  const severityColors: Record<string, string> = {
    LOW: 'bg-blue-100 text-blue-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
  };
  const colorClass = severityColors[incident.severity] ?? 'bg-slate-100 text-slate-600';

  return (
    <Link
      href={`/proctoring/incidents/${incident.id}`}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80 ${colorClass}`}
      title={`Linked incident: ${incident.title}`}
      data-testid={`incident-badge-${incident.id}`}
    >
      ⚑ {incident.severity} incident
    </Link>
  );
}

export function MonitoringTimeline({
  timeline,
  incidentsByEventId,
}: {
  timeline: ProctoringAttemptMonitoringTimelineContract;
  /**
   * Optional map of proctoring event IDs to their linked incidents.
   * Provided by the parent page when incident data is available.
   * If absent, no incident badges are shown (future enhancement path).
   */
  incidentsByEventId?: Map<string, ProctoringIncidentContract> | undefined;
}) {
  if (timeline.events.length === 0) {
    return <p data-testid="monitoring-timeline-empty">No monitoring events have been recorded.</p>;
  }

  return (
    <ul className="space-y-3" data-testid="monitoring-timeline">
      {timeline.events.map(
        (event: ProctoringAttemptMonitoringTimelineContract['events'][number]) => {
          const linkedIncident = incidentsByEventId?.get(event.id);
          return (
            <li key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{event.message}</strong>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                  {event.eventType}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                  {event.severity}
                </span>
                {linkedIncident ? <IncidentBadge incident={linkedIncident} /> : null}
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
          );
        },
      )}
    </ul>
  );
}
