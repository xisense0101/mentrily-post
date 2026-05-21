import { getMediaAssetDisplayName } from '../../state';
import type { MediaAssetContract } from '../../types';

interface AssetPickerItemProps {
  asset: MediaAssetContract;
  selected: boolean;
  onToggle(asset: MediaAssetContract): void;
}

export function AssetPickerItem({ asset, selected, onToggle }: AssetPickerItemProps) {
  return (
    <button
      data-testid="asset-picker-item"
      type="button"
      onClick={() => onToggle(asset)}
      style={{
        textAlign: 'left',
        padding: '0.85rem',
        borderRadius: '0.75rem',
        border: selected ? '2px solid #0f766e' : '1px solid #cbd5e1',
        background: selected ? '#ecfeff' : '#fff',
      }}
    >
      <strong>{getMediaAssetDisplayName(asset)}</strong>
      <div style={{ color: '#64748b' }}>{asset.fileCategory}</div>
    </button>
  );
}
