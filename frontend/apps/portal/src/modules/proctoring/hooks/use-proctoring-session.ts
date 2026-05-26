'use client';

import { useEffect, useState } from 'react';
import type { AssessmentAttemptContract } from '@/modules/assessment-attempts/types';
import type { RecordProctoringEventRequestContract } from '@mentrily/domain-contracts';
import { proctoringApiClient } from '../api/proctoring-api-client';

export function useProctoringSession(attempt: AssessmentAttemptContract | null) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(
    attempt?.proctoring?.session?.sessionId ?? null,
  );

  useEffect(() => {
    if (!attempt?.proctoring || attempt.proctoring.mode === 'OFF') {
      setStatus('idle');
      setSessionId(null);
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
      .startProctoringSession(attempt.id)
      .then((response) => {
        if (cancelled) {
          return;
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
  }, [attempt]);

  useEffect(() => {
    if (!sessionId || status !== 'active') {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void proctoringApiClient.recordProctoringHeartbeat(sessionId, {
        occurredAt: new Date().toISOString(),
      });
    }, 20_000);

    return () => window.clearInterval(intervalId);
  }, [sessionId, status]);

  async function recordEvent(input: RecordProctoringEventRequestContract): Promise<void> {
    if (!sessionId || status !== 'active') {
      return;
    }
    await proctoringApiClient.recordProctoringEvent(sessionId, input);
  }

  return { status, sessionId, recordEvent };
}
