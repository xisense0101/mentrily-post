'use client';

import { useState } from 'react';
import { MediaPageHeader, MediaErrorState } from '../components/shared';
import { MediaUploadWidget } from '../components/upload';
import { MediaAssetGrid, MediaAssetListSkeleton, MediaEmptyState } from '../components/assets';
import { AssetPickerDialog } from '../components/asset-picker';
import { useMediaAssets, useMediaUpload } from '../hooks';

export function MediaLibraryPage() {
  const assetsState = useMediaAssets();
  const uploadState = useMediaUpload({
    maxSizeBytes: 25 * 1024 * 1024,
    onAssetsChanged: () => void assetsState.refresh(),
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div data-testid="media-library-page" style={{ display: 'grid', gap: '1.5rem' }}>
      <MediaPageHeader
        title="Workspace media assets"
        description="Upload and manage private workspace media assets for future courses, assessments, and content."
        onRefresh={() => void assetsState.refresh()}
      />
      <MediaUploadWidget {...uploadState} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Asset library</h2>
        <button type="button" onClick={() => setPickerOpen(true)}>
          Open asset picker
        </button>
      </div>
      {assetsState.error ? <MediaErrorState message={assetsState.error} onRetry={() => void assetsState.refresh()} /> : null}
      {assetsState.loading ? (
        <MediaAssetListSkeleton />
      ) : assetsState.assets.length === 0 ? (
        <MediaEmptyState />
      ) : (
        <MediaAssetGrid assets={assetsState.assets} onArchive={assetsState.archiveAsset} />
      )}
      <AssetPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectionMode="multiple"
        assets={assetsState.assets.filter((asset) => asset.status === 'AVAILABLE')}
        onSelect={() => {}}
      />
    </div>
  );
}
