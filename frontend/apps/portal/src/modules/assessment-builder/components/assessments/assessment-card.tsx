import { Card } from '@mentrily/ui-system';
import type { AssessmentContract } from '../../types';
import { AssessmentPurposeBadge } from './assessment-purpose-badge';
import { AssessmentStatusBadge } from './assessment-status-badge';

interface AssessmentCardProps {
  assessment: AssessmentContract;
  href?: string | undefined;
  onOpen?: (() => void) | undefined;
}

function formatDate(value?: string): string {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

export function AssessmentCard({ assessment, href, onOpen }: AssessmentCardProps) {
  const questionCount =
    (assessment.currentDraftVersion?.sections.reduce(
      (sum, section) => sum + section.questions.length,
      0,
    ) ?? 0) + (assessment.currentDraftVersion?.looseQuestions.length ?? 0);

  const content = (
    <div data-testid="assessment-card">
      <Card className="transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-portal-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{assessment.title}</h3>
            {assessment.description ? (
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{assessment.description}</p>
            ) : null}
            <p className="mt-1 text-sm text-slate-500">
              Updated {formatDate(assessment.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AssessmentStatusBadge status={assessment.status} />
            <AssessmentPurposeBadge purpose={assessment.purpose} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
          <p>{questionCount} draft questions</p>
          <p>Published {formatDate(assessment.publishedAt)}</p>
          <p className="capitalize">
            Visibility: {assessment.visibility.toLowerCase().replace('_', ' ')}
          </p>
        </div>
      </Card>
    </div>
  );

  if (href) {
    return (
      <a
        className="block rounded-[1.75rem] focus-visible:outline-none"
        data-testid="assessment-open-link"
        href={href}
        onClick={onOpen}
      >
        {content}
      </a>
    );
  }

  return <div onClick={onOpen}>{content}</div>;
}
