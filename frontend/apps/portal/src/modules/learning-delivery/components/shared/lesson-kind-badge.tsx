import { Badge } from '@mentrily/ui-system';
import type { LearningContentKind } from '../../types';

interface LessonKindBadgeProps {
  kind: LearningContentKind | string;
}

export function LessonKindBadge({ kind }: LessonKindBadgeProps) {
  return <Badge tone="info">{kind.replace(/_/g, ' ')}</Badge>;
}
