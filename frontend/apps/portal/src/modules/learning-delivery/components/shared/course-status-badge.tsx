import { Badge } from '@mentrily/ui-system';
import type { LearningCourseStatus } from '../../types';

interface CourseStatusBadgeProps {
  status: LearningCourseStatus | string;
}

export function CourseStatusBadge({ status }: CourseStatusBadgeProps) {
  const tone =
    status === 'PUBLISHED'
      ? 'success'
      : status === 'ARCHIVED'
        ? 'danger'
        : 'warning';

  return <Badge tone={tone}>{status}</Badge>;
}
