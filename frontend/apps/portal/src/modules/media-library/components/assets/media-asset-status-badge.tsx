import type { MediaAssetStatusContract } from '../../types';

const colors: Record<MediaAssetStatusContract, { background: string; color: string }> = {
  AVAILABLE: { background: '#dcfce7', color: '#166534' },
  ARCHIVED: { background: '#e5e7eb', color: '#374151' },
  FAILED: { background: '#fee2e2', color: '#b91c1c' },
  PENDING_UPLOAD: { background: '#dbeafe', color: '#1d4ed8' },
};

export function MediaAssetStatusBadge({ status }: { status: MediaAssetStatusContract }) {
  const palette = colors[status] ?? colors.PENDING_UPLOAD;
  return (
    <span
      data-testid="media-asset-status-badge"
      style={{ display: 'inline-flex', padding: '0.25rem 0.55rem', borderRadius: '999px', background: palette.background, color: palette.color }}
    >
      {status}
    </span>
  );
}
