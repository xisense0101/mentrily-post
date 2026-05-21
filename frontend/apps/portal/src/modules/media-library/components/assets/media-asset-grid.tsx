import type { MediaAssetContract } from '../../types';
import { MediaAssetCard } from './media-asset-card';

interface MediaAssetGridProps {
  assets: MediaAssetContract[];
  onArchive(assetId: string): Promise<void> | void;
}

export function MediaAssetGrid({ assets, onArchive }: MediaAssetGridProps) {
  return (
    <div data-testid="media-asset-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      {assets.map((asset) => (
        <MediaAssetCard key={asset.id} asset={asset} onArchive={onArchive} />
      ))}
    </div>
  );
}
