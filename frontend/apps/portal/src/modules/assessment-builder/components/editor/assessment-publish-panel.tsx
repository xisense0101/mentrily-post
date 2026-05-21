import type { AssessmentContract, AssessmentPublishedSnapshotContract } from '../../types';

interface AssessmentPublishPanelProps {
  assessment: AssessmentContract;
  latestSnapshot?: AssessmentPublishedSnapshotContract | null | undefined;
}

function formatDate(value?: string): string {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString();
}

export function AssessmentPublishPanel({
  assessment,
  latestSnapshot,
}: AssessmentPublishPanelProps) {
  const totalQuestions =
    (assessment.currentDraftVersion?.sections.reduce(
      (sum, section) => sum + section.questions.length,
      0,
    ) ?? 0) + (assessment.currentDraftVersion?.looseQuestions.length ?? 0);

  const isDraft = assessment.status === 'DRAFT';
  const isPublished = assessment.status === 'PUBLISHED';
  const isArchived = assessment.status === 'ARCHIVED';

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm space-y-3"
      data-testid="assessment-publish-panel"
    >
      <h3 className="text-sm font-semibold text-slate-900">Publish status</h3>

      <div className="space-y-2 text-sm">
        {isDraft ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700">
            This assessment is a <strong>draft</strong>. Publish it to make it available for
            delivery.
          </div>
        ) : null}

        {isPublished ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-700">
            This assessment is <strong>published</strong>. Learners can be assigned to it.
          </div>
        ) : null}

        {isArchived ? (
          <div className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-slate-600">
            This assessment is <strong>archived</strong>. Restore to resume editing.
          </div>
        ) : null}

        {totalQuestions === 0 && isDraft ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700">
            ⚠ No questions yet. Add at least one question before publishing.
          </div>
        ) : null}
      </div>

      <div className="grid gap-2 text-xs text-slate-500">
        <p>
          <span className="font-medium text-slate-700">Draft questions:</span> {totalQuestions}
        </p>
        <p>
          <span className="font-medium text-slate-700">Last published:</span>{' '}
          {formatDate(assessment.publishedAt)}
        </p>
        {latestSnapshot ? (
          <p>
            <span className="font-medium text-slate-700">Snapshot version:</span>{' '}
            {latestSnapshot.versionNumber}
          </p>
        ) : null}
      </div>
    </div>
  );
}
