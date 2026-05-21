interface TrueFalseAnswerInputProps {
  value: boolean | null;
  disabled?: boolean | undefined;
  onChange: (value: boolean) => void;
}

export function TrueFalseAnswerInput({ value, disabled, onChange }: TrueFalseAnswerInputProps) {
  return (
    <fieldset
      className="grid gap-3 sm:grid-cols-2"
      data-testid="attempt-answer-input"
      disabled={disabled}
    >
      <legend className="sr-only">True false answer</legend>
      {[
        { label: 'True', nextValue: true },
        { label: 'False', nextValue: false },
      ].map((option) => (
        <label
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-portal-border bg-white px-4 py-3 text-sm font-medium text-portal-text"
          key={option.label}
        >
          <input
            checked={value === option.nextValue}
            disabled={disabled}
            name="true-false-answer"
            onChange={() => onChange(option.nextValue)}
            type="radio"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
