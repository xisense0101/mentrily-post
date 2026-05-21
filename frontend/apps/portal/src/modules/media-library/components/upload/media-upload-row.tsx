import { formatMediaFileSize } from '../../state';
import type { MediaUploadQueueItem } from '../../types';

interface MediaUploadRowProps {
  item: MediaUploadQueueItem;
  onRetry(itemId: string): void;
  onCancel(itemId: string): void;
}

export function MediaUploadRow({ item, onRetry, onCancel }: MediaUploadRowProps) {
  return (
    <div
      data-testid="media-upload-row"
      style={{ border: '1px solid #dbe4ee', borderRadius: '0.85rem', padding: '0.85rem 1rem', background: '#fff' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <strong>{item.file.name}</strong>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
            {item.fileCategory} · {formatMediaFileSize(item.file.size)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>{item.status}</div>
          <div data-testid="media-upload-progress">{item.progress.percent}%</div>
        </div>
      </div>
      {item.error ? <p style={{ color: '#b91c1c' }}>{item.error}</p> : null}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {item.status === 'FAILED' ? (
          <button data-testid="media-upload-retry-button" type="button" onClick={() => onRetry(item.id)}>
            Retry
          </button>
        ) : null}
        {['READY', 'VALIDATING', 'UPLOADING', 'COMPLETING'].includes(item.status) ? (
          <button data-testid="media-upload-cancel-button" type="button" onClick={() => onCancel(item.id)}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
