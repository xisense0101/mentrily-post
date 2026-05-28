'use client';

import { useEffect, useState } from 'react';
import type { AssessmentAttemptContract } from '@/modules/assessment-attempts/types';
import type {
  RecordProctoringEventRequestContract,
  SecurityPolicyRuntimeStateContract,
} from '@mentrily/domain-contracts';
import { proctoringApiClient } from '../api/proctoring-api-client';

export function useProctoringSession(
  attempt: AssessmentAttemptContract | null,
  options?: {
    /** Set to true when the learner has acknowledged the monitoring disclosure */
    acknowledgeDisclosure?: boolean;
    /** Set to true when the learner has declared fullscreen is active */
    fullscreenSatisfied?: boolean;
  },
) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'active' | 'blocked' | 'error'>(
    'idle',
  );
  const [sessionId, setSessionId] = useState<string | null>(
    attempt?.proctoring?.session?.sessionId ?? null,
  );
  const [securityState, setSecurityState] = useState<SecurityPolicyRuntimeStateContract | null>(
    null,
  );

  const acknowledgeDisclosure = options?.acknowledgeDisclosure ?? false;
  const fullscreenSatisfied = options?.fullscreenSatisfied ?? false;

  useEffect(() => {
    if (!attempt?.proctoring || attempt.proctoring.mode === 'OFF') {
      setStatus('idle');
      setSessionId(null);
      setSecurityState(null);
      return;
    }

    if (attempt.status !== 'IN_PROGRESS') {
      setStatus('idle');
      setSessionId(attempt.proctoring.session?.sessionId ?? null);
      return;
    }

    if (attempt.proctoring.session?.sessionId) {
      setStatus('active');
      setSessionId(attempt.proctoring.session.sessionId);
      return;
    }

    let cancelled = false;
    setStatus('starting');
    void proctoringApiClient
      .startProctoringSession(attempt.id, {
        acknowledgeDisclosure,
        fullscreenSatisfied,
      })
      .then((response) => {
        if (cancelled) {
          return;
        }
        if (response.securityState) {
          setSecurityState(response.securityState);
          if (!response.securityState.canStartMonitoring) {
            setStatus('blocked');
            return;
          }
        }
        setSessionId(response.summary.session?.sessionId ?? null);
        setStatus(response.summary.session?.sessionId ? 'active' : 'idle');
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, acknowledgeDisclosure, fullscreenSatisfied]);

  useEffect(() => {
    if (!sessionId || status !== 'active') {
      return undefined;
    }

    const heartbeatIntervalMs = Math.max(
      15_000,
      (attempt?.proctoring?.policy?.heartbeatIntervalSeconds ?? 30) * 1000,
    );

    const intervalId = window.setInterval(() => {
      void proctoringApiClient.recordProctoringHeartbeat(sessionId, {
        occurredAt: new Date().toISOString(),
      });
    }, heartbeatIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [attempt?.proctoring?.policy?.heartbeatIntervalSeconds, sessionId, status]);

  async function recordEvent(input: RecordProctoringEventRequestContract): Promise<void> {
    if (!sessionId || status !== 'active') {
      return;
    }
    await proctoringApiClient.recordProctoringEvent(sessionId, input);
  }

  return { status, sessionId, securityState, recordEvent };
}
