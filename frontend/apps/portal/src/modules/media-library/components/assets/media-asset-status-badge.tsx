import type { MediaAssetStatusContract, MediaScanStatusContract } from '../../types';

const colors: Record<MediaAssetStatusContract, { background: string; color: string }> = {
  AVAILABLE: { background: '#dcfce7', color: '#166534' },
  ARCHIVED: { background: '#e5e7eb', color: '#374151' },
  FAILED: { background: '#fee2e2', color: '#b91c1c' },
  PENDING_UPLOAD: { background: '#dbeafe', color: '#1d4ed8' },
  UPLOADED: { background: '#fef3c7', color: '#92400e' },
  PROCESSING_QUEUED: { background: '#fef3c7', color: '#92400e' },
  PROCESSING: { background: '#fef08a', color: '#854d0e' },
  PROCESSING_FAILED: { background: '#fecdd3', color: '#9f1239' },
  ABANDONED: { background: '#f5f5f5', color: '#737373' },
  DELETE_QUEUED: { background: '#ffedd5', color: '#c2410c' },
  DELETED: { background: '#fee2e2', color: '#991b1b' },
};

export function MediaAssetStatusBadge({ status }: { status: MediaAssetStatusContract }) {
  const palette = colors[status] ?? colors.PENDING_UPLOAD;
  return (
    <span
      data-testid="media-asset-status-badge"
      style={{ display: 'inline-flex', padding: '0.25rem 0.55rem', borderRadius: '999px', background: palette.background, color: palette.color, fontSize: '0.8rem', fontWeight: 500 }}
    >
      {status}
    </span>
  );
}

const scanColors: Record<MediaScanStatusContract, { background: string; color: string; label: string }> = {
  UNSCANNED: { background: '#f3f4f6', color: '#4b5563', label: 'Unscanned' },
  SCAN_QUEUED: { background: '#e0f2fe', color: '#0369a1', label: 'Scanning' },
  SCANNING: { background: '#e0f2fe', color: '#0369a1', label: 'Scanning' },
  CLEAN: { background: '#dcfce7', color: '#15803d', label: 'Clean' },
  SUSPICIOUS: { background: '#fef3c7', color: '#b45309', label: 'Suspicious' },
  INFECTED: { background: '#fee2e2', color: '#be123c', label: 'Infected' },
  QUARANTINED: { background: '#fee2e2', color: '#be123c', label: 'Quarantined' },
  SCAN_FAILED: { background: '#fee2e2', color: '#991b1b', label: 'Scan failed' },
};

export function MediaSecurityScanBadge({ scanStatus }: { scanStatus: MediaScanStatusContract }) {
  const palette = scanColors[scanStatus] ?? { background: '#f3f4f6', color: '#4b5563', label: 'Unscanned' };
  return (
    <span
      data-testid="media-security-scan-badge"
      style={{ display: 'inline-flex', padding: '0.25rem 0.55rem', borderRadius: '999px', background: palette.background, color: palette.color, fontSize: '0.8rem', fontWeight: 500 }}
    >
      {palette.label}
    </span>
  );
}
