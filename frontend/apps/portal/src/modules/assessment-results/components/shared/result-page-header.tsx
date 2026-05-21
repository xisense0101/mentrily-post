export function ResultPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">Assessment results</p>
      <h1 className="text-3xl font-semibold text-portal-text">{title}</h1>
      <p className="text-sm leading-7 text-portal-text-muted">{description}</p>
    </header>
  );
}
