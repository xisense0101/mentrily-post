import type { MediaAssetContract } from '../../types';
import { AssetPickerItem } from './asset-picker-item';

interface AssetPickerGridProps {
  assets: MediaAssetContract[];
  selectedIds: string[];
  onToggle(asset: MediaAssetContract): void;
}

export function AssetPickerGrid({ assets, selectedIds, onToggle }: AssetPickerGridProps) {
  return (
    <div data-testid="asset-picker-grid" style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      {assets.map((asset) => (
        <AssetPickerItem key={asset.id} asset={asset} selected={selectedIds.includes(asset.id)} onToggle={onToggle} />
      ))}
    </div>
  );
}
