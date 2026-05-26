'use client';

import { useCallback, useEffect, useState } from 'react';
import { assessmentAttemptApiClient } from '../api';
import { AssessmentAttemptApiError } from '../api/assessment-attempt-api-errors';
import { getTimerSeverity, toAnswerPayload } from '../state';
import type {
  AssessmentAttemptContract,
  AssessmentPublishedSnapshotContract,
  AssessmentQuestionKindContract,
} from '../types';

export function useAssessmentAttempt(attemptId: string) {
  const [attempt, setAttempt] = useState<AssessmentAttemptContract | null>(null);
  const [snapshot, setSnapshot] = useState<AssessmentPublishedSnapshotContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [saveSuccessQuestionId, setSaveSuccessQuestionId] = useState<string | null>(null);
  const [saveErrorQuestionId, setSaveErrorQuestionId] = useState<string | null>(null);
  const [saveConflictQuestionId, setSaveConflictQuestionId] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncOnlineStatus = () => {
      const offline = !window.navigator.onLine;
      setIsOffline(offline);
      if (!offline) {
        setWasOffline(true);
      }
    };

    syncOnlineStatus();
    window.addEventListener('online', syncOnlineStatus);
    window.addEventListener('offline', syncOnlineStatus);

    return () => {
      window.removeEventListener('online', syncOnlineStatus);
      window.removeEventListener('offline', syncOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!saveSuccessQuestionId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveSuccessQuestionId(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [saveSuccessQuestionId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextAttempt, nextSnapshot] = await Promise.all([
        assessmentAttemptApiClient.getAssessmentAttempt(attemptId),
        assessmentAttemptApiClient.getAssessmentAttemptSnapshot(attemptId),
      ]);
      setAttempt(nextAttempt);
      setSnapshot(nextSnapshot);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load attempt.');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveAnswer = useCallback(
    async (questionId: string, questionKind: AssessmentQuestionKindContract, value: unknown) => {
      if (typeof window !== 'undefined' && !window.navigator.onLine) {
        const message = 'Connection lost. Reconnect and retry saving.';
        setIsOffline(true);
        setSaveErrorQuestionId(questionId);
        setSaveErrorMessage(message);
        throw new Error(message);
      }

      setSavingQuestionId(questionId);
      setSaveSuccessQuestionId(null);
      setSaveErrorQuestionId(null);
      setSaveConflictQuestionId(null);
      setSaveErrorMessage(null);
      setError(null);

      try {
        const updatedAttempt = await assessmentAttemptApiClient.saveAssessmentAttemptAnswer(
          attemptId,
          questionId,
          {
            questionId,
            questionKind,
            answer: toAnswerPayload({ questionKind, value }),
          },
        );
        setAttempt(updatedAttempt);
        setSaveSuccessQuestionId(questionId);
      } catch (cause) {
        let message = cause instanceof Error ? cause.message : 'Failed to save answer.';
        if (cause instanceof AssessmentAttemptApiError && cause.code === 'CONFLICT') {
          const reason = String(cause.details?.reason ?? '');
          if (reason === 'ATTEMPT_EXPIRED') {
            message = 'This attempt expired. Refresh to see the locked state.';
          } else if (reason === 'ATTEMPT_NOT_EDITABLE') {
            message = 'This attempt is no longer editable. Refresh to continue safely.';
          }
          setSaveConflictQuestionId(questionId);
        }
        setSaveErrorQuestionId(questionId);
        setSaveErrorMessage(message);
        setError(message);
        throw cause;
      } finally {
        setSavingQuestionId(null);
      }
    },
    [attemptId],
  );

  const submitAttempt = useCallback(async () => {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      const message = 'Connection lost. Reconnect and retry submission.';
      setIsOffline(true);
      setSubmitErrorMessage(message);
      throw new Error(message);
    }

    setSubmitting(true);
    setSubmitErrorMessage(null);
    setError(null);

    try {
      const updatedAttempt = await assessmentAttemptApiClient.submitAssessmentAttempt(attemptId);
      setAttempt(updatedAttempt);
    } catch (cause) {
      let message = cause instanceof Error ? cause.message : 'Failed to submit attempt.';
      if (cause instanceof AssessmentAttemptApiError && cause.code === 'CONFLICT') {
        const reason = String(cause.details?.reason ?? '');
        if (reason === 'ATTEMPT_EXPIRED') {
          message = 'This attempt expired before submission completed.';
        } else if (reason === 'ATTEMPT_NOT_SUBMITTABLE') {
          message = 'This attempt can no longer be submitted.';
        }
      }
      setSubmitErrorMessage(message);
      setError(message);
      throw cause;
    } finally {
      setSubmitting(false);
    }
  }, [attemptId]);

  const cancelAttempt = useCallback(async () => {
    setCancelling(true);
    setError(null);

    try {
      const updatedAttempt = await assessmentAttemptApiClient.cancelAssessmentAttempt(attemptId);
      setAttempt(updatedAttempt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to cancel attempt.');
      throw cause;
    } finally {
      setCancelling(false);
    }
  }, [attemptId]);

  return {
    attempt,
    snapshot,
    loading,
    saving: savingQuestionId !== null,
    savingQuestionId,
    saveSuccessQuestionId,
    saveErrorQuestionId,
    saveConflictQuestionId,
    saveErrorMessage,
    submitting,
    submitErrorMessage,
    cancelling,
    error,
    isOffline,
    wasOffline,
    timerSeverity: attempt ? getTimerSeverity(attempt) : null,
    refresh,
    saveAnswer,
    submitAttempt,
    cancelAttempt,
  };
}
