interface AttemptOption {
  id: string;
  label: string;
  description?: string | undefined;
}

interface McqAnswerInputProps {
  name: string;
  options: AttemptOption[];
  value: string;
  disabled?: boolean | undefined;
  onChange: (value: string) => void;
}

export function McqAnswerInput({ name, options, value, disabled, onChange }: McqAnswerInputProps) {
  return (
    <fieldset className="space-y-3" data-testid="attempt-answer-input" disabled={disabled}>
      <legend className="sr-only">Multiple choice answer</legend>
      {options.map((option) => (
        <label
          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-portal-border bg-white px-4 py-3 text-sm text-portal-text"
          key={option.id}
        >
          <input
            checked={value === option.id}
            disabled={disabled}
            name={name}
            onChange={() => onChange(option.id)}
            type="radio"
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
