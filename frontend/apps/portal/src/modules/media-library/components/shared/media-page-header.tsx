interface MediaPageHeaderProps {
  title: string;
  description: string;
  onRefresh?: (() => void) | undefined;
}

export function MediaPageHeader({ title, description, onRefresh }: MediaPageHeaderProps) {
  return (
    <header data-testid="media-page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
      <div>
        <p style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>
          Media Library
        </p>
        <h1 style={{ marginBottom: '0.5rem' }}>{title}</h1>
        <p style={{ margin: 0, maxWidth: '48rem', lineHeight: 1.6 }}>{description}</p>
      </div>
      {onRefresh ? (
        <button type="button" onClick={onRefresh}>
          Refresh
        </button>
      ) : null}
    </header>
  );
}
