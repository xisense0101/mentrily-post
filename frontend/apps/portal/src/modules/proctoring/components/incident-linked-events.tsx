'use client';

import type { ProctoringEventContract } from '@mentrily/domain-contracts';

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

export function IncidentLinkedEvents({ events }: { events: ProctoringEventContract[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500" data-testid="incident-linked-events-empty">
        No linked events recorded for this incident.
      </p>
    );
  }

  return (
    <ul className="space-y-2" data-testid="incident-linked-events">
      {events.map((event) => (
        <li
          key={event.id}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
          data-testid={`incident-event-${event.id}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-800">{event.message}</span>
            <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
              {event.eventType.replace(/_/g, ' ')}
            </span>
            <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
              {event.severity}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Occurred at {formatDate(event.occurredAt)}</p>
        </li>
      ))}
    </ul>
  );
}
