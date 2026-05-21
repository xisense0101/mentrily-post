import type { MediaUploadQueueItem } from '../../types';
import { MediaUploadRow } from './media-upload-row';

interface MediaUploadProgressListProps {
  items: MediaUploadQueueItem[];
  onRetry(itemId: string): void;
  onCancel(itemId: string): void;
}

export function MediaUploadProgressList({ items, onRetry, onCancel }: MediaUploadProgressListProps) {
  if (items.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {items.map((item) => (
        <MediaUploadRow key={item.id} item={item} onRetry={onRetry} onCancel={onCancel} />
      ))}
    </div>
  );
}
