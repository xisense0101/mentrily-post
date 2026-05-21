export function AssessmentEmptyState() {
  return (
    <div
      className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/90 p-8 text-center shadow-sm"
      data-testid="assessment-empty-state"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg text-slate-500 shadow-sm">
        ·
      </div>
      <h3 className="text-lg font-semibold text-slate-900">No assessments yet</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        Create your first quiz, exam, or assignment to start building your assessment library.
      </p>
    </div>
  );
}
