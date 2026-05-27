import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import type {
  AddProctoringIncidentNoteRequestContract,
  CreateManualProctoringIncidentRequestContract,
  ProctoringAttemptMonitoringSummaryContract,
  ProctoringAttemptMonitoringTimelineContract,
  ProctoringHeartbeatRequestContract,
  ProctoringIncidentDetailContract,
  ProctoringIncidentListResponseContract,
  ProctoringIncidentSummaryContract,
  ProctoringSessionContract,
  RecordProctoringEventRequestContract,
  RecordProctoringEventResponseContract,
  StartProctoringSessionResponseContract,
  UpdateProctoringIncidentStatusRequestContract,
} from '@mentrily/domain-contracts';

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ?? '';

interface ProctoringApiClientOptions {
  baseUrl?: string | undefined;
  envSource?: NodeJS.ProcessEnv | undefined;
  fetchImpl?: typeof fetch | undefined;
}

interface ErrorEnvelope {
  error?: { message?: string | undefined };
}

interface IncidentListQuery {
  assessmentId?: string | undefined;
  attemptId?: string | undefined;
  status?: string | undefined;
  severity?: string | undefined;
}

function resolveApiBaseUrl(baseUrl?: string, envSource?: NodeJS.ProcessEnv): string {
  return (
    baseUrl ??
    envSource?.NEXT_PUBLIC_PLATFORM_API_URL ??
    envSource?.NEXT_PUBLIC_PLATFORM_API_BASE_URL ??
    PUBLIC_PLATFORM_API_URL
  ).replace(/\/$/, '');
}

function withBaseUrl(baseUrl: string, path: string): string {
  return baseUrl ? `${baseUrl}${path}` : path;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  let envelope: ErrorEnvelope | undefined;
  try {
    envelope = (await response.json()) as ErrorEnvelope;
  } catch {
    envelope = undefined;
  }

  throw new Error(envelope?.error?.message ?? response.statusText ?? 'Proctoring request failed');
}

export function createProctoringApiClient({
  baseUrl,
  envSource,
  fetchImpl = fetch,
}: ProctoringApiClientOptions = {}) {
  const apiBaseUrl = resolveApiBaseUrl(baseUrl, envSource);

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const e2eHeaders = buildE2ERequestHeaders(undefined, envSource);
    const response = await fetchImpl(withBaseUrl(apiBaseUrl, path), {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(e2eHeaders ?? {}),
        ...(init?.headers ?? {}),
      },
    });
    return parseResponse<T>(response);
  }

  return {
    startProctoringSession(attemptId: string): Promise<StartProctoringSessionResponseContract> {
      return request(`/workspace/proctoring/attempts/${attemptId}/session/start`, {
        method: 'POST',
      });
    },

    recordProctoringHeartbeat(
      sessionId: string,
      input: ProctoringHeartbeatRequestContract,
    ): Promise<ProctoringSessionContract> {
      return request(`/workspace/proctoring/sessions/${sessionId}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    recordProctoringEvent(
      sessionId: string,
      input: RecordProctoringEventRequestContract,
    ): Promise<RecordProctoringEventResponseContract> {
      return request(`/workspace/proctoring/sessions/${sessionId}/events`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    endProctoringSession(sessionId: string): Promise<ProctoringSessionContract> {
      return request(`/workspace/proctoring/sessions/${sessionId}/end`, { method: 'POST' });
    },

    getAttemptMonitoringTimeline(
      attemptId: string,
    ): Promise<ProctoringAttemptMonitoringTimelineContract> {
      return request(`/workspace/proctoring/attempts/${attemptId}/timeline`);
    },

    getActiveAssessmentMonitoring(
      assessmentId: string,
    ): Promise<ProctoringAttemptMonitoringSummaryContract> {
      return request(`/workspace/proctoring/assessments/${assessmentId}/active`);
    },

    listProctoringIncidents(
      query?: IncidentListQuery,
    ): Promise<ProctoringIncidentListResponseContract> {
      const params = new URLSearchParams();
      if (query?.assessmentId) params.set('assessmentId', query.assessmentId);
      if (query?.attemptId) params.set('attemptId', query.attemptId);
      if (query?.status) params.set('status', query.status);
      if (query?.severity) params.set('severity', query.severity);
      const qs = params.toString();
      return request(`/workspace/proctoring/incidents${qs ? `?${qs}` : ''}`);
    },

    getProctoringIncidentSummary(): Promise<ProctoringIncidentSummaryContract> {
      return request('/workspace/proctoring/incidents/summary');
    },

    getProctoringIncidentDetail(incidentId: string): Promise<ProctoringIncidentDetailContract> {
      return request(`/workspace/proctoring/incidents/${incidentId}`);
    },

    updateProctoringIncidentStatus(
      incidentId: string,
      input: UpdateProctoringIncidentStatusRequestContract,
    ): Promise<ProctoringIncidentDetailContract> {
      return request(`/workspace/proctoring/incidents/${incidentId}/status`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    addProctoringIncidentNote(
      incidentId: string,
      input: AddProctoringIncidentNoteRequestContract,
    ): Promise<ProctoringIncidentDetailContract> {
      return request(`/workspace/proctoring/incidents/${incidentId}/notes`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    createManualProctoringIncident(
      input: CreateManualProctoringIncidentRequestContract,
    ): Promise<ProctoringIncidentDetailContract> {
      return request('/workspace/proctoring/incidents/manual', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
  };
}

export const proctoringApiClient = createProctoringApiClient();
