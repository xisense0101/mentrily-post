'use client';

import { useMemo, useState } from 'react';
import type { MediaAssetContract, MediaFileCategoryContract } from '../../types';
import { MediaFileCategorySelect } from '../upload';
import { AssetPickerEmptyState } from './asset-picker-empty-state';
import { AssetPickerGrid } from './asset-picker-grid';

export interface AssetPickerDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  selectionMode?: 'single' | 'multiple';
  allowedCategories?: MediaFileCategoryContract[];
  assets: MediaAssetContract[];
  onSelect(assets: MediaAssetContract[]): void;
}

export function AssetPickerDialog({
  open,
  onOpenChange,
  selectionMode = 'single',
  allowedCategories,
  assets,
  onSelect,
}: AssetPickerDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<MediaFileCategoryContract | ''>('');

  const visibleAssets = useMemo(
    () =>
      assets.filter((asset) => {
        const categoryAllowed = !allowedCategories || allowedCategories.includes(asset.fileCategory);
        const categoryMatches = !categoryFilter || asset.fileCategory === categoryFilter;
        return categoryAllowed && categoryMatches;
      }),
    [allowedCategories, assets, categoryFilter],
  );

  if (!open) return null;

  return (
    <div
      data-testid="asset-picker-dialog"
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: '10% 8%', background: '#fff', border: '1px solid #dbe4ee', borderRadius: '1rem', padding: '1.25rem', overflow: 'auto' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Select media assets</h2>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close
        </button>
      </div>
      <div style={{ margin: '1rem 0' }}>
        <MediaFileCategorySelect value={categoryFilter} onChange={setCategoryFilter} />
      </div>
      {visibleAssets.length === 0 ? (
        <AssetPickerEmptyState />
      ) : (
        <AssetPickerGrid
          assets={visibleAssets}
          selectedIds={selectedIds}
          onToggle={(asset) =>
            setSelectedIds((current) => {
              if (selectionMode === 'single') {
                return current.includes(asset.id) ? [] : [asset.id];
              }
              return current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id];
            })
          }
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <button type="button" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
        <button
          data-testid="asset-picker-confirm-button"
          type="button"
          onClick={() => {
            onSelect(assets.filter((asset) => selectedIds.includes(asset.id)));
            onOpenChange(false);
          }}
        >
          Confirm selection
        </button>
      </div>
    </div>
  );
}
