import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssetPickerDialog } from '../components/asset-picker';
import type { MediaAssetContract } from '../types';

const assets: MediaAssetContract[] = [
  {
    id: 'asset_1',
    ownerPrincipalId: 'principal_1',
    filename: 'example.png',
    contentType: 'image/png',
    fileCategory: 'IMAGE',
    sizeBytes: 1000,
    checksumSha256: 'hash',
    storageProvider: 'FIXTURE',
    visibility: 'PRIVATE',
    status: 'AVAILABLE',
    metadata: {},
    createdAt: '2026-05-21T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'asset_2',
    ownerPrincipalId: 'principal_1',
    filename: 'document.pdf',
    contentType: 'application/pdf',
    fileCategory: 'DOCUMENT',
    sizeBytes: 2000,
    checksumSha256: 'hash',
    storageProvider: 'FIXTURE',
    visibility: 'PRIVATE',
    status: 'AVAILABLE',
    metadata: {},
    createdAt: '2026-05-21T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
  },
];

describe('AssetPickerDialog', () => {
  it('renders assets, filters by category, and supports single select', () => {
    const onSelect = vi.fn();
    render(<AssetPickerDialog open onOpenChange={vi.fn()} assets={assets} onSelect={onSelect} />);
    expect(screen.getAllByTestId('asset-picker-item')).toHaveLength(2);
    fireEvent.change(screen.getByDisplayValue('All categories'), { target: { value: 'IMAGE' } });
    expect(screen.getAllByTestId('asset-picker-item')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('asset-picker-item'));
    fireEvent.click(screen.getByTestId('asset-picker-confirm-button'));
    expect(onSelect).toHaveBeenCalledWith([assets[0]]);
  });

  it('supports multiple select and empty state', () => {
    const onSelect = vi.fn();
    render(
      <AssetPickerDialog
        open
        onOpenChange={vi.fn()}
        selectionMode="multiple"
        allowedCategories={['VIDEO']}
        assets={assets}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByTestId('asset-picker-empty-state')).toBeInTheDocument();
  });
});
