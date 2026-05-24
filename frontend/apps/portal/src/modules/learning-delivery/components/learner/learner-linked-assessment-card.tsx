import { Badge, Button, Card } from '@mentrily/ui-system';
import type { LearnerLinkedAssessmentContract } from '../../types';

interface LearnerLinkedAssessmentCardProps {
  assessment: LearnerLinkedAssessmentContract;
}

function actionLabel(status: LearnerLinkedAssessmentContract['status']): string {
  return status === 'IN_PROGRESS' ? 'Continue assessment' : 'Start assessment';
}

export function LearnerLinkedAssessmentCard({ assessment }: LearnerLinkedAssessmentCardProps) {
  const canOpenResult = Boolean(assessment.attemptId && assessment.resultReleased);
  const canResumeAttempt =
    assessment.available &&
    (assessment.status === 'AVAILABLE' ||
      assessment.status === 'NOT_STARTED' ||
      assessment.status === 'IN_PROGRESS');

  return (
    <Card
      className="space-y-3 rounded-2xl border border-slate-200 bg-white"
      data-testid={`learner-linked-assessment-card-${assessment.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-slate-900">
          {assessment.assessmentTitle ?? 'Linked assessment'}
        </p>
        <Badge>{assessment.required ? 'Required' : 'Optional'}</Badge>
        <Badge>{assessment.status}</Badge>
      </div>

      {assessment.unavailableReason ? (
        <p className="text-sm text-slate-600">{assessment.unavailableReason}</p>
      ) : null}

      {assessment.resultReleased ? (
        <p className="text-sm text-slate-700">
          Result released
          {assessment.score !== undefined && assessment.maxScore !== undefined
            ? ` · ${assessment.score}/${assessment.maxScore}`
            : ''}
          {assessment.passed !== undefined ? ` · ${assessment.passed ? 'Passed' : 'Failed'}` : ''}
        </p>
      ) : assessment.status === 'AWAITING_GRADING' || assessment.status === 'SUBMITTED' ? (
        <p className="text-sm text-slate-700">Result pending. Scores appear only after release.</p>
      ) : null}

      {assessment.blockingCompletion ? (
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
          Required for course completion
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canResumeAttempt ? (
          <a href={`/assessments/${assessment.assessmentId}/attempt`}>
            <Button>{actionLabel(assessment.status)}</Button>
          </a>
        ) : null}
        {canOpenResult ? (
          <a href={`/attempts/${assessment.attemptId}/result`}>
            <Button variant="secondary">View result</Button>
          </a>
        ) : null}
      </div>
    </Card>
  );
}
