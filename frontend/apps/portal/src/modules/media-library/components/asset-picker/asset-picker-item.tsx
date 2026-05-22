import { getMediaAssetDisplayName } from '../../state';
import type { MediaAssetContract } from '../../types';

interface AssetPickerItemProps {
  asset: MediaAssetContract;
  selected: boolean;
  onToggle(asset: MediaAssetContract): void;
}

export function AssetPickerItem({ asset, selected, onToggle }: AssetPickerItemProps) {
  const isAvailable = asset.status === 'AVAILABLE' && asset.scanStatus === 'CLEAN';
  let statusMessage = '';
  if (asset.status !== 'AVAILABLE') {
    statusMessage = ` (${asset.status})`;
  } else if (asset.scanStatus !== 'CLEAN') {
    statusMessage = ` (${asset.scanStatus})`;
  }

  return (
    <button
      data-testid="asset-picker-item"
      type="button"
      disabled={!isAvailable}
      onClick={() => onToggle(asset)}
      style={{
        textAlign: 'left',
        padding: '0.85rem',
        borderRadius: '0.75rem',
        border: selected ? '2px solid #0f766e' : '1px solid #cbd5e1',
        background: selected ? '#ecfeff' : isAvailable ? '#fff' : '#f8fafc',
        opacity: isAvailable ? 1 : 0.6,
        cursor: isAvailable ? 'pointer' : 'not-allowed',
      }}
    >
      <strong>{getMediaAssetDisplayName(asset)}</strong>
      <div style={{ color: '#64748b' }}>
        {asset.fileCategory} {!isAvailable ? `· Unavailable${statusMessage}` : ''}
      </div>
    </button>
  );
}
