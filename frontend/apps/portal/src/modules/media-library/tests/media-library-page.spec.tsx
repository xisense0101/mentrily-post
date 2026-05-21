import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaLibraryPage } from '../routes';

const assetsHook = vi.fn();
const uploadHook = vi.fn();

vi.mock('../hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks')>();
  return {
    ...actual,
    useMediaAssets: () => assetsHook(),
    useMediaUpload: () => uploadHook(),
  };
});

describe('MediaLibraryPage', () => {
  it('renders loading state', () => {
    assetsHook.mockReturnValue({
      assets: [],
      loading: true,
      error: undefined,
      refresh: vi.fn(),
      archiveAsset: vi.fn(),
    });
    uploadHook.mockReturnValue({
      items: [],
      uploading: false,
      error: undefined,
      addFiles: vi.fn(),
      startUpload: vi.fn().mockResolvedValue(undefined),
      retryUpload: vi.fn().mockResolvedValue(undefined),
      cancelUpload: vi.fn(),
      clearCompleted: vi.fn(),
    });
    render(<MediaLibraryPage />);
    expect(screen.getByTestId('media-library-page')).toBeInTheDocument();
  });

  it('renders empty and error states', () => {
    assetsHook.mockReturnValue({
      assets: [],
      loading: false,
      error: 'No access.',
      refresh: vi.fn(),
      archiveAsset: vi.fn(),
    });
    uploadHook.mockReturnValue({
      items: [],
      uploading: false,
      error: undefined,
      addFiles: vi.fn(),
      startUpload: vi.fn().mockResolvedValue(undefined),
      retryUpload: vi.fn().mockResolvedValue(undefined),
      cancelUpload: vi.fn(),
      clearCompleted: vi.fn(),
    });
    render(<MediaLibraryPage />);
    expect(screen.getByTestId('media-error-state')).toBeInTheDocument();
    expect(screen.getByTestId('media-empty-state')).toBeInTheDocument();
  });

  it('renders upload widget and asset grid together', () => {
    assetsHook.mockReturnValue({
      assets: [
        {
          id: 'asset_1',
          ownerPrincipalId: 'principal_1',
          filename: 'example.png',
          contentType: 'image/png',
          fileCategory: 'IMAGE',
          sizeBytes: 200,
          checksumSha256: 'hash',
          storageProvider: 'FIXTURE',
          objectKey: 'media/example.png',
          visibility: 'PRIVATE',
          status: 'AVAILABLE',
          metadata: {},
          createdAt: '2026-05-21T00:00:00.000Z',
          updatedAt: '2026-05-21T00:00:00.000Z',
        },
      ],
      loading: false,
      error: undefined,
      refresh: vi.fn(),
      archiveAsset: vi.fn(),
    });
    uploadHook.mockReturnValue({
      items: [],
      uploading: false,
      error: undefined,
      addFiles: vi.fn(),
      startUpload: vi.fn().mockResolvedValue(undefined),
      retryUpload: vi.fn().mockResolvedValue(undefined),
      cancelUpload: vi.fn(),
      clearCompleted: vi.fn(),
    });
    render(<MediaLibraryPage />);
    expect(screen.getByTestId('media-upload-widget')).toBeInTheDocument();
    expect(screen.getByTestId('media-asset-grid')).toBeInTheDocument();
  });
});
