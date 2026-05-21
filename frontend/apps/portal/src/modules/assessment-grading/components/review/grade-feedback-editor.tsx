interface GradeFeedbackEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function GradeFeedbackEditor({ value, onChange, disabled }: GradeFeedbackEditorProps) {
  return (
    <textarea
      data-testid="manual-grade-feedback-input"
      className="min-h-24 w-full rounded-xl border border-portal-border px-3 py-2 text-sm"
      disabled={disabled}
      placeholder="Feedback (optional)"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
