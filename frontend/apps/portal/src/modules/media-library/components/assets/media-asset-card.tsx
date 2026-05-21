'use client';

import { useState } from 'react';
import { formatMediaFileSize, getMediaAssetDisplayName, isPreviewableMediaAsset } from '../../state';
import { MediaAssetStatusBadge } from './media-asset-status-badge';
import { MediaAssetPreview } from './media-asset-preview';
import { useMediaReadUrl } from '../../hooks';
import type { MediaAssetContract } from '../../types';

interface MediaAssetCardProps {
  asset: MediaAssetContract;
  onArchive(assetId: string): Promise<void> | void;
}

export function MediaAssetCard({ asset, onArchive }: MediaAssetCardProps) {
  const [previewRequested, setPreviewRequested] = useState(false);
  const { readUrl, loading, error, loadReadUrl } = useMediaReadUrl();

  const canPreview = isPreviewableMediaAsset(asset);

  return (
    <article
      data-testid="media-asset-card"
      style={{ borderRadius: '1rem', border: '1px solid #dbe4ee', background: '#fff', padding: '1rem', display: 'grid', gap: '0.85rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>{getMediaAssetDisplayName(asset)}</h3>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b' }}>
            {asset.fileCategory} · {asset.contentType} · {formatMediaFileSize(asset.sizeBytes)}
          </p>
        </div>
        <MediaAssetStatusBadge status={asset.status} />
      </div>
      <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
        <div>Created: {new Date(asset.createdAt).toLocaleString()}</div>
        <div>Updated: {new Date(asset.updatedAt).toLocaleString()}</div>
      </div>
      {previewRequested && canPreview ? (
        loading ? (
          <p>Loading preview...</p>
        ) : error ? (
          <p>{error}</p>
        ) : (
          <MediaAssetPreview asset={asset} readUrl={readUrl} />
        )
      ) : null}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {canPreview ? (
          <button
            data-testid="media-open-button"
            type="button"
            onClick={async () => {
              setPreviewRequested(true);
              await loadReadUrl(asset.id);
            }}
          >
            Open
          </button>
        ) : null}
        {asset.status !== 'ARCHIVED' ? (
          <button data-testid="media-archive-button" type="button" onClick={() => void onArchive(asset.id)}>
            Archive
          </button>
        ) : null}
      </div>
    </article>
  );
}
