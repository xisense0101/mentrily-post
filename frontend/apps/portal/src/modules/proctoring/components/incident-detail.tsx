'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  ProctoringIncidentDetailContract,
  ProctoringIncidentStatusContract,
} from '@mentrily/domain-contracts';
import { proctoringApiClient } from '../api/proctoring-api-client';
import { IncidentStatusBadge } from './incident-status-badge';
import { IncidentSeverityBadge } from './incident-severity-badge';
import { IncidentLinkedEvents } from './incident-linked-events';
import { IncidentReviewActions } from './incident-review-actions';
import { IncidentNoteForm } from './incident-note-form';

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

export function IncidentDetail({ incidentId }: { incidentId: string }) {
  const [detail, setDetail] = useState<ProctoringIncidentDetailContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    proctoringApiClient
      .getProctoringIncidentDetail(incidentId)
      .then((data) => {
        setDetail(data);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Failed to load incident details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusUpdate(status: ProctoringIncidentStatusContract) {
    setSubmitting(true);
    setActionError(null);
    try {
      await proctoringApiClient.updateProctoringIncidentStatus(incidentId, { status });
      load();
    } catch (cause: unknown) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to update incident status.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNote(note: string) {
    setSubmitting(true);
    setActionError(null);
    try {
      await proctoringApiClient.addProctoringIncidentNote(incidentId, { note });
      load();
    } catch (cause: unknown) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to add note.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p className="text-slate-500" data-testid="incident-detail-loading">
        Loading incident details…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-red-600" role="alert" data-testid="incident-detail-error">
        {error}
      </p>
    );
  }

  if (!detail) {
    return (
      <p className="text-slate-500" data-testid="incident-detail-not-found">
        Incident not found.
      </p>
    );
  }

  const { incident, events, reviewActions } = detail;

  return (
    <div className="space-y-8" data-testid="incident-detail">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900" data-testid="incident-detail-title">
            {incident.title}
          </h2>
          <p className="mt-1 text-slate-500" data-testid="incident-detail-summary">
            {incident.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <IncidentSeverityBadge severity={incident.severity} />
          <IncidentStatusBadge status={incident.status} />
        </div>
      </div>

      {/* Metadata */}
      <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Type</dt>
          <dd className="mt-1 text-slate-700">{incident.incidentType.replace(/_/g, ' ')}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Events</dt>
          <dd className="mt-1 text-slate-700">{incident.eventCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            First Event
          </dt>
          <dd className="mt-1 text-slate-700">{formatDate(incident.firstEventAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Last Event
          </dt>
          <dd className="mt-1 text-slate-700">{formatDate(incident.lastEventAt)}</dd>
        </div>
        {incident.learnerDisplayName ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Learner
            </dt>
            <dd className="mt-1 text-slate-700">{incident.learnerDisplayName}</dd>
          </div>
        ) : null}
        {incident.reviewedByDisplayName ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Reviewed By
            </dt>
            <dd className="mt-1 text-slate-700">{incident.reviewedByDisplayName}</dd>
          </div>
        ) : null}
        {incident.resolution ? (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Resolution
            </dt>
            <dd className="mt-1 text-slate-700">{incident.resolution}</dd>
          </div>
        ) : null}
      </dl>

      {/* Review Actions */}
      <section>
        <h3 className="mb-4 text-base font-semibold text-slate-800">Review Actions</h3>
        {actionError ? (
          <p className="mb-3 text-sm text-red-600" role="alert" data-testid="incident-action-error">
            {actionError}
          </p>
        ) : null}
        <IncidentReviewActions
          actions={reviewActions}
          currentStatus={incident.status}
          submitting={submitting}
          onMarkInReview={() => void handleStatusUpdate('IN_REVIEW')}
          onResolve={() => void handleStatusUpdate('RESOLVED')}
          onDismiss={() => void handleStatusUpdate('DISMISSED')}
          onEscalate={() => void handleStatusUpdate('ESCALATED')}
        />
      </section>

      {/* Note Form */}
      <section>
        <IncidentNoteForm submitting={submitting} onSubmit={(note) => void handleAddNote(note)} />
      </section>

      {/* Linked Events */}
      <section>
        <h3 className="mb-4 text-base font-semibold text-slate-800">Linked Monitoring Events</h3>
        <IncidentLinkedEvents events={events} />
      </section>
    </div>
  );
}
