import { Badge } from '@mentrily/ui-system';
import type { ContentDocumentPurposeContract } from '../../types';

interface ContentPurposeBadgeProps {
  purpose: ContentDocumentPurposeContract | string;
}

const LABELS: Record<string, string> = {
  COURSE_CONTENT: 'Course',
  LESSON_CONTENT: 'Lesson',
  ASSESSMENT_CONTENT_RESERVED: 'Assessment reserved',
  QUESTION_CONTENT_RESERVED: 'Question reserved',
  GENERAL_PAGE: 'General page',
};

export function ContentPurposeBadge({ purpose }: ContentPurposeBadgeProps) {
  return <Badge tone="info">{LABELS[purpose] ?? purpose}</Badge>;
}
