export function MediaEmptyState() {
  return (
    <div
      data-testid="media-empty-state"
      style={{ padding: '2rem', borderRadius: '1rem', border: '1px dashed #cbd5e1', textAlign: 'center', background: '#fff' }}
    >
      No media assets yet. Upload a file to seed the library.
    </div>
  );
}
