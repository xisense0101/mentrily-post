import { Button } from '@mentrily/ui-system';
import type { AssessmentQuestionKindContract } from '../../types';

interface QuestionCreateToolbarProps {
  onAdd: (kind: AssessmentQuestionKindContract) => void;
  disabled?: boolean | undefined;
}

const QUESTION_BUTTONS: Array<{
  kind: AssessmentQuestionKindContract;
  label: string;
}> = [
  { kind: 'MCQ', label: 'MCQ' },
  { kind: 'MULTI_SELECT', label: 'Multi-select' },
  { kind: 'TRUE_FALSE', label: 'True/False' },
  { kind: 'SHORT_ANSWER', label: 'Short answer' },
  { kind: 'LONG_ANSWER', label: 'Long answer' },
  { kind: 'READING_PASSAGE', label: 'Reading passage' },
  { kind: 'FILE_UPLOAD', label: 'File upload' },
  { kind: 'CODE', label: 'Code placeholder' },
];

export function QuestionCreateToolbar({ onAdd, disabled }: QuestionCreateToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="assessment-question-create-toolbar">
      <span className="self-center text-xs font-medium text-slate-500">+ Add question:</span>
      {QUESTION_BUTTONS.map(({ kind, label }) => (
        <Button
          data-testid={`assessment-add-${kind.toLowerCase().replace('_', '-')}-button`}
          disabled={disabled}
          key={kind}
          onClick={() => onAdd(kind)}
          type="button"
          variant="secondary"
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
