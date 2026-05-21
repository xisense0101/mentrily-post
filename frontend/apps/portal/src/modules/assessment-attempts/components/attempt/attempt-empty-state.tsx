export function AttemptEmptyState() {
  return (
    <div
      className="rounded-[1.75rem] border border-dashed border-portal-border bg-white/70 p-10 text-center shadow-portal-sm"
      data-testid="attempt-empty-state"
    >
      <h3 className="text-lg font-semibold text-portal-text">No attempts yet</h3>
      <p className="mt-2 text-sm leading-6 text-portal-text-muted">
        Start a published quiz, exam, or assignment to see it here.
      </p>
    </div>
  );
}
