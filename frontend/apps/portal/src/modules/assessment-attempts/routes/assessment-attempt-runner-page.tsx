'use client';

import { AttemptPageHeader, AttemptErrorState } from '../components/shared';
import { AttemptRunnerShell } from '../components/attempt';
import { useAssessmentAttempt } from '../hooks';
import { ProctoringSecurityGate } from '@/modules/proctoring/components/proctoring-security-gate';

interface AssessmentAttemptRunnerPageProps {
  attemptId: string;
}

export function AssessmentAttemptRunnerPage({ attemptId }: AssessmentAttemptRunnerPageProps) {
  const {
    attempt,
    snapshot,
    loading,
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
    proctoringSession,
    securityGateState,
    setGateAcknowledgeDisclosure,
    setGateFullscreenSatisfied,
    timerSeverity,
    refresh,
    saveAnswer,
    submitAttempt,
    cancelAttempt,
  } = useAssessmentAttempt(attemptId);

  // Show the security gate if the session is blocked by policy gates
  const showSecurityGate =
    !loading &&
    !error &&
    attempt?.status === 'IN_PROGRESS' &&
    attempt?.proctoring?.mode === 'BASIC_EVENT_MONITORING' &&
    proctoringSession.status === 'blocked' &&
    securityGateState !== null;

  return (
    <div className="portal-page space-y-8" data-testid="attempt-runner-page">
      <AttemptPageHeader
        eyebrow="Learner attempts"
        title="Attempt runner"
        description="Answer questions from the published snapshot, save draft responses, and submit when finished."
        actions={
          <a
            className="rounded-full border border-portal-border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
            href="/attempts"
          >
            Back to attempts
          </a>
        }
      />

      {loading ? (
        <div className="rounded-[2rem] border border-portal-border bg-white/80 p-8 text-sm text-slate-500 shadow-portal-sm">
          Loading attempt workspace, published snapshot, and saved answers...
        </div>
      ) : null}

      {!loading && error ? (
        <AttemptErrorState
          message={error}
          title="Attempt unavailable"
          onRetry={() => void refresh()}
        />
      ) : null}

      {showSecurityGate && securityGateState ? (
        <ProctoringSecurityGate
          securityState={securityGateState}
          onAcknowledge={({ acknowledgeDisclosure, fullscreenSatisfied }) => {
            setGateAcknowledgeDisclosure(acknowledgeDisclosure);
            setGateFullscreenSatisfied(fullscreenSatisfied);
          }}
        />
      ) : null}

      {!loading && !error && !showSecurityGate && attempt && snapshot ? (
        <AttemptRunnerShell
          attempt={attempt}
          cancelling={cancelling}
          onCancel={() => cancelAttempt()}
          onSaveAnswer={saveAnswer}
          onSubmit={() => submitAttempt()}
          isOffline={isOffline}
          savingQuestionId={savingQuestionId}
          saveErrorMessage={saveErrorMessage}
          saveErrorQuestionId={saveErrorQuestionId}
          saveConflictQuestionId={saveConflictQuestionId}
          saveSuccessQuestionId={saveSuccessQuestionId}
          snapshot={snapshot}
          submitErrorMessage={submitErrorMessage}
          submitting={submitting}
          proctoringSessionStatus={proctoringSession.status}
          timerSeverity={timerSeverity}
          wasOffline={wasOffline}
        />
      ) : null}
    </div>
  );
}
