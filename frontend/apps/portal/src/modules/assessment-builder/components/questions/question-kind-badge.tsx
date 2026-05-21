import { Badge } from '@mentrily/ui-system';
import type { AssessmentQuestionKindContract } from '../../types';

const KIND_CONFIG: Record<
  AssessmentQuestionKindContract,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  MCQ: { label: 'MCQ', tone: 'info' },
  MULTI_SELECT: { label: 'Multi-select', tone: 'info' },
  TRUE_FALSE: { label: 'True/False', tone: 'success' },
  SHORT_ANSWER: { label: 'Short answer', tone: 'warning' },
  LONG_ANSWER: { label: 'Long answer', tone: 'warning' },
  CODE: { label: 'Code', tone: 'danger' },
  NOTEBOOK: { label: 'Notebook', tone: 'neutral' },
  READING_PASSAGE: { label: 'Reading passage', tone: 'neutral' },
  FILE_UPLOAD: { label: 'File upload', tone: 'neutral' },
  RUBRIC_ONLY: { label: 'Rubric only', tone: 'neutral' },
};

interface QuestionKindBadgeProps {
  kind: string;
}

export function QuestionKindBadge({ kind }: QuestionKindBadgeProps) {
  const config = KIND_CONFIG[kind as AssessmentQuestionKindContract] ?? {
    label: kind,
    tone: 'neutral' as const,
  };

  return <Badge tone={config.tone}>{config.label}</Badge>;
}
