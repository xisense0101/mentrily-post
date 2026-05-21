import { Select } from '@mentrily/ui-system';
import { useId } from 'react';
import type { AssessmentGradingModeContract } from '../../types';

interface GradingModePickerProps {
  value: AssessmentGradingModeContract;
  onChange: (mode: AssessmentGradingModeContract) => void;
  disabled?: boolean | undefined;
}

export function GradingModePicker({ value, onChange, disabled }: GradingModePickerProps) {
  const id = useId();

  return (
    <div className="space-y-1" data-testid="assessment-question-grading-mode-select">
      <label className="text-xs font-medium text-slate-600" htmlFor={id}>
        Grading mode
      </label>
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as AssessmentGradingModeContract)}
        disabled={disabled}
      >
        <option value="AUTO">Auto</option>
        <option value="MANUAL">Manual</option>
        <option value="HYBRID">Hybrid</option>
      </Select>
    </div>
  );
}
