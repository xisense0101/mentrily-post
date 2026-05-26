'use client';

import { AttemptPageHeader, AttemptErrorState } from '../components/shared';
import { AttemptRunnerShell } from '../components/attempt';
import { useAssessmentAttempt } from '../hooks';

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
    timerSeverity,
    refresh,
    saveAnswer,
    submitAttempt,
    cancelAttempt,
  } = useAssessmentAttempt(attemptId);

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

      {!loading && !error && attempt && snapshot ? (
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
          timerSeverity={timerSeverity}
          wasOffline={wasOffline}
        />
      ) : null}
    </div>
  );
}
