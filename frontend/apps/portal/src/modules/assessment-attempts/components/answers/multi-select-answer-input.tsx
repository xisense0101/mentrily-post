interface AttemptOption {
  id: string;
  label: string;
  description?: string | undefined;
}

interface MultiSelectAnswerInputProps {
  options: AttemptOption[];
  value: string[];
  disabled?: boolean | undefined;
  onChange: (value: string[]) => void;
}

export function MultiSelectAnswerInput({
  options,
  value,
  disabled,
  onChange,
}: MultiSelectAnswerInputProps) {
  function toggleOption(optionId: string): void {
    if (value.includes(optionId)) {
      onChange(value.filter((item) => item !== optionId));
      return;
    }

    onChange([...value, optionId]);
  }

  return (
    <fieldset className="space-y-3" data-testid="attempt-answer-input" disabled={disabled}>
      <legend className="sr-only">Multi-select answer</legend>
      {options.map((option) => (
        <label
          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-portal-border bg-white px-4 py-3 text-sm text-portal-text"
          key={option.id}
        >
          <input
            checked={value.includes(option.id)}
            disabled={disabled}
            onChange={() => toggleOption(option.id)}
            type="checkbox"
            value={option.id}
          />
          <span>
            <span className="font-medium">{option.label}</span>
            {option.description ? (
              <span className="mt-1 block text-xs text-portal-text-muted">
                {option.description}
              </span>
            ) : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
