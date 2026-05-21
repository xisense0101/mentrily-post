import type { MediaAssetContract, MediaReadUrlContract } from '../../types';

interface MediaAssetPreviewProps {
  asset: MediaAssetContract;
  readUrl?: MediaReadUrlContract | undefined;
}

export function MediaAssetPreview({ asset, readUrl }: MediaAssetPreviewProps) {
  if (!readUrl) return <p style={{ margin: 0, color: '#64748b' }}>Preview requires a signed read URL.</p>;

  if (asset.fileCategory === 'IMAGE') {
    return <img data-testid="media-asset-preview" alt={asset.filename} src={readUrl.url} style={{ width: '100%', borderRadius: '0.75rem' }} />;
  }
  if (asset.fileCategory === 'VIDEO') {
    return <video data-testid="media-asset-preview" controls src={readUrl.url} style={{ width: '100%', borderRadius: '0.75rem' }} />;
  }
  if (asset.fileCategory === 'AUDIO') {
    return <audio data-testid="media-asset-preview" controls src={readUrl.url} style={{ width: '100%' }} />;
  }

  return (
    <a data-testid="media-asset-preview" href={readUrl.url} rel="noreferrer" target="_blank">
      Open asset
    </a>
  );
}
