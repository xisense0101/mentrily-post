import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaAssetCard } from '../components/assets';
import type { MediaAssetContract } from '../types';

vi.mock('../hooks', () => ({
  useMediaReadUrl: () => ({
    readUrl: { url: 'https://signed.example/image.png', method: 'GET', headers: {}, expiresAt: '2026-05-21T00:00:00.000Z' },
    loading: false,
    error: undefined,
    loadReadUrl: vi.fn().mockResolvedValue(undefined),
    clearReadUrl: vi.fn(),
  }),
}));

function makeAsset(overrides: Partial<MediaAssetContract> = {}): MediaAssetContract {
  return {
    id: 'asset_1',
    ownerPrincipalId: 'principal_1',
    filename: 'example.png',
    contentType: 'image/png',
    fileCategory: 'IMAGE',
    sizeBytes: 2048,
    checksumSha256: 'hash',
    storageProvider: 'FIXTURE',
    visibility: 'PRIVATE',
    status: 'AVAILABLE',
    metadata: {},
    createdAt: '2026-05-21T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('MediaAssetCard', () => {
  it('renders metadata and archive action', () => {
    const onArchive = vi.fn();
    render(<MediaAssetCard asset={makeAsset()} onArchive={onArchive} />);
    expect(screen.getByText('example.png')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('media-archive-button'));
    expect(onArchive).toHaveBeenCalledWith('asset_1');
  });

  it('does not preview pending or archived assets', () => {
    render(<MediaAssetCard asset={makeAsset({ status: 'PENDING_UPLOAD' })} onArchive={vi.fn()} />);
    expect(screen.queryByTestId('media-open-button')).not.toBeInTheDocument();

    render(<MediaAssetCard asset={makeAsset({ status: 'ARCHIVED', archivedAt: '2026-05-21T01:00:00.000Z' })} onArchive={vi.fn()} />);
    expect(screen.queryByTestId('media-open-button')).not.toBeInTheDocument();
  });

  it('can request an image preview', async () => {
    render(<MediaAssetCard asset={makeAsset()} onArchive={vi.fn()} />);
    fireEvent.click(screen.getByTestId('media-open-button'));
    await waitFor(() => expect(screen.getByTestId('media-asset-preview')).toBeInTheDocument());
  });
});
