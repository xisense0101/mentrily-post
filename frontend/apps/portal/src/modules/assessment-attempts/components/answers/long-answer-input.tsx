interface LongAnswerInputProps {
  value: string;
  disabled?: boolean | undefined;
  onChange: (value: string) => void;
}

export function LongAnswerInput({ value, disabled, onChange }: LongAnswerInputProps) {
  return (
    <textarea
      className="min-h-32 w-full rounded-2xl border border-portal-border bg-white px-4 py-3 text-sm text-portal-text shadow-sm outline-none transition focus:border-portal-accent"
      data-testid="attempt-answer-input"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    />
  );
}
