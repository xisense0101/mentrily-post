import { describe, expect, it, vi } from 'vitest';
import { createProctoringApiClient } from '../api/proctoring-api-client';

function createJsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn(async () => body),
  } as unknown as Response;
}

describe('proctoringApiClient', () => {
  it('starts a proctoring session without tenant or workspace ids in the body', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { summary: { enabled: true } }));
    const client = createProctoringApiClient({ fetchImpl });

    await client.startProctoringSession('attempt-1');

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/workspace/proctoring/attempts/attempt-1/session/start');
    expect(init.method).toBe('POST');
    expect(String(init.body ?? '')).not.toContain('tenantId');
    expect(String(init.body ?? '')).not.toContain('workspaceId');
  });

  it('gets assessment security policy from the workspace-scoped route', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(200, {
        assessmentId: 'assessment-1',
        proctoringMode: 'OFF',
        requireDisclosureAcknowledgement: true,
        requireFullscreen: false,
        trackFocusChanges: true,
        trackVisibilityChanges: true,
        trackFullscreenChanges: true,
        trackCopyPasteAttempts: true,
        trackNetworkStatus: true,
        heartbeatIntervalSeconds: 30,
        incidentThresholdFocusLossCount: 3,
        incidentThresholdFocusLossWindowSeconds: 600,
        incidentThresholdVisibilityHiddenCount: 3,
        incidentThresholdVisibilityHiddenWindowSeconds: 600,
        incidentThresholdNetworkOfflineCount: 3,
        incidentThresholdNetworkOfflineWindowSeconds: 600,
      }),
    );
    const client = createProctoringApiClient({ fetchImpl });

    await client.getAssessmentSecurityPolicy('assessment-1');

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/workspace/proctoring/assessments/assessment-1/security-policy');
    expect(init.method).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('updates assessment security policy without tenant or workspace ids in the body', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(200, {
        assessmentId: 'assessment-1',
        proctoringMode: 'BASIC_EVENT_MONITORING',
        requireDisclosureAcknowledgement: true,
        requireFullscreen: false,
        trackFocusChanges: true,
        trackVisibilityChanges: true,
        trackFullscreenChanges: true,
        trackCopyPasteAttempts: true,
        trackNetworkStatus: true,
        heartbeatIntervalSeconds: 30,
        incidentThresholdFocusLossCount: 3,
        incidentThresholdFocusLossWindowSeconds: 600,
        incidentThresholdVisibilityHiddenCount: 3,
        incidentThresholdVisibilityHiddenWindowSeconds: 600,
        incidentThresholdNetworkOfflineCount: 3,
        incidentThresholdNetworkOfflineWindowSeconds: 600,
      }),
    );
    const client = createProctoringApiClient({ fetchImpl });

    await client.updateAssessmentSecurityPolicy('assessment-1', {
      proctoringMode: 'BASIC_EVENT_MONITORING',
      requireDisclosureAcknowledgement: true,
      requireFullscreen: false,
      trackFocusChanges: true,
      trackVisibilityChanges: true,
      trackFullscreenChanges: true,
      trackCopyPasteAttempts: true,
      trackNetworkStatus: true,
      heartbeatIntervalSeconds: 30,
      incidentThresholdFocusLossCount: 3,
      incidentThresholdFocusLossWindowSeconds: 600,
      incidentThresholdVisibilityHiddenCount: 3,
      incidentThresholdVisibilityHiddenWindowSeconds: 600,
      incidentThresholdNetworkOfflineCount: 3,
      incidentThresholdNetworkOfflineWindowSeconds: 600,
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/workspace/proctoring/assessments/assessment-1/security-policy');
    expect(init.method).toBe('POST');
    expect(String(init.body)).toContain('BASIC_EVENT_MONITORING');
    expect(String(init.body)).not.toContain('tenantId');
    expect(String(init.body)).not.toContain('workspaceId');
  });

  it('records metadata-only events', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { duplicate: false, event: {} }));
    const client = createProctoringApiClient({ fetchImpl });

    await client.recordProctoringEvent('session-1', {
      eventType: 'COPY_ATTEMPTED',
      metadata: { questionId: 'question-1' },
    });

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(init.body)).not.toContain('clipboardData');
  });

  it('listProctoringIncidents calls correct URL without tenantId or workspaceId in body', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { incidents: [] }));
    const client = createProctoringApiClient({ fetchImpl });

    await client.listProctoringIncidents({ status: 'OPEN', severity: 'HIGH' });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/workspace/proctoring/incidents');
    expect(url).toContain('status=OPEN');
    expect(url).toContain('severity=HIGH');
    expect(init.method).toBeUndefined(); // GET (no method override)
    expect(init.body).toBeUndefined();
  });

  it('listProctoringIncidents with no filters hits base incident path', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { incidents: [] }));
    const client = createProctoringApiClient({ fetchImpl });

    await client.listProctoringIncidents();

    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/workspace/proctoring/incidents');
  });

  it('getProctoringIncidentSummary calls summary endpoint', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(200, {
        openCount: 3,
        highSeverityCount: 1,
        inReviewCount: 0,
        resolvedDismissedCount: 2,
        attemptsWithIncidentsCount: 2,
      }),
    );
    const client = createProctoringApiClient({ fetchImpl });

    const result = await client.getProctoringIncidentSummary();

    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/workspace/proctoring/incidents/summary');
    expect(result.openCount).toBe(3);
  });

  it('getProctoringIncidentDetail calls correct URL', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(200, { incident: { id: 'inc-1' }, events: [], reviewActions: [] }),
    );
    const client = createProctoringApiClient({ fetchImpl });

    await client.getProctoringIncidentDetail('inc-1');

    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/workspace/proctoring/incidents/inc-1');
  });

  it('updateProctoringIncidentStatus POSTs without tenantId or workspaceId', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(200, { incident: {}, events: [], reviewActions: [] }),
    );
    const client = createProctoringApiClient({ fetchImpl });

    await client.updateProctoringIncidentStatus('inc-1', { status: 'RESOLVED' });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/workspace/proctoring/incidents/inc-1/status');
    expect(init.method).toBe('POST');
    expect(String(init.body)).toContain('RESOLVED');
    expect(String(init.body)).not.toContain('tenantId');
    expect(String(init.body)).not.toContain('workspaceId');
  });

  it('addProctoringIncidentNote POSTs note without private fields', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(200, { incident: {}, events: [], reviewActions: [] }),
    );
    const client = createProctoringApiClient({ fetchImpl });

    await client.addProctoringIncidentNote('inc-1', { note: 'Reviewed and noted.' });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/workspace/proctoring/incidents/inc-1/notes');
    expect(init.method).toBe('POST');
    expect(String(init.body)).toContain('Reviewed and noted.');
    expect(String(init.body)).not.toContain('graderNotes');
    expect(String(init.body)).not.toContain('unreleasedScore');
    expect(String(init.body)).not.toContain('storageKey');
  });

  it('createManualProctoringIncident POSTs without webcam/screen/audio fields', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(200, { incident: {}, events: [], reviewActions: [] }),
    );
    const client = createProctoringApiClient({ fetchImpl });

    await client.createManualProctoringIncident({
      sessionId: 'sess-1',
      attemptId: 'att-1',
      assessmentId: 'assess-1',
      learnerPrincipalId: 'learner-1',
      incidentType: 'MANUAL_REVIEW_FLAG',
      severity: 'MEDIUM',
      title: 'Manual flag',
      summary: 'Instructor flagged for review',
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/workspace/proctoring/incidents/manual');
    expect(init.method).toBe('POST');
    expect(String(init.body)).not.toContain('getUserMedia');
    expect(String(init.body)).not.toContain('MediaRecorder');
    expect(String(init.body)).not.toContain('clipboardData');
  });
});
