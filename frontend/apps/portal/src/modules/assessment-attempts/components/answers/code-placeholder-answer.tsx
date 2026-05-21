interface CodePlaceholderAnswerProps {
  value: string;
  disabled?: boolean | undefined;
  onChange: (value: string) => void;
}

export function CodePlaceholderAnswer({ value, disabled, onChange }: CodePlaceholderAnswerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-portal-text-muted">
        Code execution is not available yet. Save plain source text only.
      </p>
      <textarea
        className="min-h-40 w-full rounded-2xl border border-portal-border bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 shadow-sm outline-none transition focus:border-portal-accent"
        data-testid="attempt-answer-input"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        value={value}
      />
    </div>
  );
}
