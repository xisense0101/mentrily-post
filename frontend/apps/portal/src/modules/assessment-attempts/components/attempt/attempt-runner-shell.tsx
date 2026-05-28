import {
  countAnswerableQuestions,
  countAnsweredQuestions,
  findAnswerForQuestion,
  flattenSnapshotQuestions,
  getAttemptExpiresAt,
  getRemainingTimeMs,
  isAttemptEditable,
  isAttemptSubmittable,
  isQuestionAnswerable,
} from '../../state';
import type { AssessmentAttemptContract, AssessmentPublishedSnapshotContract } from '../../types';
import { AttemptProgressPanel } from './attempt-progress-panel';
import { AttemptQuestionCard } from './attempt-question-card';
import { AttemptResultPlaceholder } from './attempt-result-placeholder';
import { AttemptStatusBadge } from './attempt-status-badge';
import { AttemptSubmitPanel } from './attempt-submit-panel';
import { AttemptTimerBanner } from './attempt-timer-banner';
import { ProctoringDisclosureCard } from '@/modules/proctoring/components/proctoring-disclosure-card';
import { ProctoringStatusBadge } from '@/modules/proctoring/components/proctoring-status-badge';

interface AttemptRunnerShellProps {
  attempt: AssessmentAttemptContract;
  snapshot: AssessmentPublishedSnapshotContract;
  savingQuestionId: string | null;
  saveSuccessQuestionId: string | null;
  saveErrorQuestionId: string | null;
  saveConflictQuestionId: string | null;
  saveErrorMessage?: string | null;
  submitting: boolean;
  submitErrorMessage?: string | null;
  cancelling: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  proctoringSessionStatus?: 'idle' | 'starting' | 'active' | 'blocked' | 'error';
  timerSeverity?: 'normal' | 'warning' | 'urgent' | 'expired' | null | undefined;
  onSaveAnswer: (
    questionId: string,
    questionKind: AssessmentQuestionContract['kind'],
    value: unknown,
  ) => Promise<void>;
  onSubmit: () => Promise<void>;
  onCancel: () => Promise<void>;
}

import type { AssessmentQuestionContract } from '../../types';

export function AttemptRunnerShell({
  attempt,
  snapshot,
  savingQuestionId,
  saveSuccessQuestionId,
  saveErrorQuestionId,
  saveConflictQuestionId,
  saveErrorMessage,
  submitting,
  submitErrorMessage,
  cancelling,
  isOffline,
  wasOffline,
  proctoringSessionStatus,
  timerSeverity,
  onSaveAnswer,
  onSubmit,
  onCancel,
}: AttemptRunnerShellProps) {
  const questions = flattenSnapshotQuestions(snapshot);
  const editable = isAttemptEditable(attempt);
  const submittable = isAttemptSubmittable(attempt);
  const answerableCount = countAnswerableQuestions(questions);
  const contextCount = questions.length - answerableCount;
  const answeredCount = countAnsweredQuestions({
    questions,
    answers: attempt.answers,
  });
  const remainingMs = getRemainingTimeMs(attempt);
  const remainingLabel =
    typeof remainingMs === 'number' && remainingMs > 0
      ? `${Math.floor(remainingMs / 60_000)}m ${Math.floor((remainingMs % 60_000) / 1000)}s`
      : undefined;

  return (
    <div className="space-y-6" data-testid="attempt-runner-shell">
      <section className="rounded-[2rem] border border-portal-border bg-white/90 p-8 shadow-portal-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">
              Published snapshot
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-portal-text">
              {snapshot.assessmentId}
            </h2>
            <p className="mt-2 text-sm leading-6 text-portal-text-muted">
              Snapshot version {snapshot.versionNumber}. Questions render from the immutable
              published snapshot only.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <AttemptStatusBadge status={attempt.status} />
            {attempt.proctoring ? (
              <ProctoringStatusBadge
                summary={attempt.proctoring}
                {...(proctoringSessionStatus ? { status: proctoringSessionStatus } : {})}
              />
            ) : null}
          </div>
        </div>
      </section>

      {attempt.proctoring ? <ProctoringDisclosureCard summary={attempt.proctoring} /> : null}

      <AttemptTimerBanner
        expiresAt={getAttemptExpiresAt(attempt)}
        remainingLabel={remainingLabel}
        severity={timerSeverity}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          {questions.map((question) => (
            <AttemptQuestionCard
              assessmentId={attempt.assessmentId}
              answer={findAnswerForQuestion({ attempt, questionId: question.id })}
              attemptId={attempt.id}
              isSaving={savingQuestionId === question.id}
              saveConflict={saveConflictQuestionId === question.id}
              saveError={
                saveErrorQuestionId === question.id ? (saveErrorMessage ?? undefined) : undefined
              }
              saveSucceeded={saveSuccessQuestionId === question.id}
              key={question.id}
              onSave={(value) => onSaveAnswer(question.id, question.kind, value)}
              question={question}
              readOnly={!editable || isOffline || !isQuestionAnswerable(question.kind)}
            />
          ))}
        </div>

        <aside className="space-y-5">
          <AttemptProgressPanel
            answeredCount={answeredCount}
            contextCount={contextCount}
            totalCount={answerableCount}
          />
          <AttemptSubmitPanel
            cancelling={cancelling}
            editable={editable}
            isOffline={isOffline}
            onCancel={onCancel}
            onSubmit={onSubmit}
            statusLabel={attempt.status}
            submittable={submittable}
            submitError={submitErrorMessage ?? undefined}
            submitting={submitting}
            wasOffline={wasOffline}
          />
          {attempt.status === 'SUBMITTED' || attempt.result ? (
            <AttemptResultPlaceholder result={attempt.result} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
