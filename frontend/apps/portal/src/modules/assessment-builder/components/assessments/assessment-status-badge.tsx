import { Badge } from '@mentrily/ui-system';
import type { AssessmentStatusContract } from '../../types';

const STATUS_CONFIG: Record<
  AssessmentStatusContract,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  DRAFT: { label: 'Draft', tone: 'warning' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};

interface AssessmentStatusBadgeProps {
  status: string;
}

export function AssessmentStatusBadge({ status }: AssessmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status as AssessmentStatusContract] ?? {
    label: status,
    tone: 'neutral' as const,
  };

  return <Badge tone={config.tone}>{config.label}</Badge>;
}
