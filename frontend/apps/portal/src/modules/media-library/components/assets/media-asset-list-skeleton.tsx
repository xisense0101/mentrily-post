export function MediaAssetListSkeleton() {
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} style={{ height: '7rem', borderRadius: '1rem', background: '#e2e8f0' }} />
      ))}
    </div>
  );
}
