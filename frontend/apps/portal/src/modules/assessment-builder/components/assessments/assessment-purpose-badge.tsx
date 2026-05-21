import { Badge } from '@mentrily/ui-system';
import type { AssessmentPurposeContract } from '../../types';

const PURPOSE_CONFIG: Record<
  AssessmentPurposeContract,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  QUIZ: { label: 'Quiz', tone: 'info' },
  EXAM: { label: 'Exam', tone: 'danger' },
  PRACTICE: { label: 'Practice', tone: 'success' },
  ASSIGNMENT: { label: 'Assignment', tone: 'warning' },
  PLACEMENT_TEST: { label: 'Placement Test', tone: 'info' },
  CERTIFICATION: { label: 'Certification', tone: 'success' },
};

interface AssessmentPurposeBadgeProps {
  purpose: string;
}

export function AssessmentPurposeBadge({ purpose }: AssessmentPurposeBadgeProps) {
  const config = PURPOSE_CONFIG[purpose as AssessmentPurposeContract] ?? {
    label: purpose,
    tone: 'neutral' as const,
  };

  return <Badge tone={config.tone}>{config.label}</Badge>;
}
