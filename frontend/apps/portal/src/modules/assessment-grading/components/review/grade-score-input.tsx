interface GradeScoreInputProps {
  value: string;
  onChange: (value: string) => void;
  maxScore: number;
  disabled?: boolean;
}

export function GradeScoreInput({ value, onChange, maxScore, disabled }: GradeScoreInputProps) {
  return (
    <label className="block text-sm">
      Score (max {maxScore})
      <input
        data-testid="manual-grade-score-input"
        className="mt-1 w-full rounded-xl border border-portal-border px-3 py-2"
        disabled={disabled}
        min={0}
        max={maxScore}
        step="0.1"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
