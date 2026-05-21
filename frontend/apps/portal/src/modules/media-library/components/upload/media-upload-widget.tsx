'use client';

import { MediaDropzone } from './media-dropzone';
import { MediaUploadErrorState } from './media-upload-error-state';
import { MediaUploadProgressList } from './media-upload-progress-list';
import type { MediaUploadQueueItem } from '../../types';

interface MediaUploadWidgetProps {
  items: MediaUploadQueueItem[];
  uploading: boolean;
  error?: string | undefined;
  addFiles(files: File[]): void;
  startUpload(): Promise<void>;
  retryUpload(itemId: string): Promise<void>;
  cancelUpload(itemId: string): void;
  clearCompleted(): void;
}

export function MediaUploadWidget({
  items,
  uploading,
  error,
  addFiles,
  startUpload,
  retryUpload,
  cancelUpload,
  clearCompleted,
}: MediaUploadWidgetProps) {
  return (
    <section
      data-testid="media-upload-widget"
      style={{
        display: 'grid',
        gap: '1rem',
        padding: '1.25rem',
        borderRadius: '1rem',
        border: '1px solid #dbe4ee',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <div>
          <h2 style={{ marginBottom: '0.4rem' }}>Upload workspace media</h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Files upload directly to signed storage URLs and are completed through the Media Library API.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            data-testid="media-upload-start-button"
            type="button"
            disabled={uploading || items.every((item) => !['READY', 'FAILED', 'CANCELLED'].includes(item.status))}
            onClick={() => void startUpload()}
          >
            {uploading ? 'Uploading...' : 'Start upload'}
          </button>
          <button type="button" onClick={clearCompleted}>
            Clear completed
          </button>
        </div>
      </div>
      {error ? <MediaUploadErrorState message={error} /> : null}
      <MediaDropzone onFilesSelected={addFiles} />
      <MediaUploadProgressList items={items} onRetry={(id) => void retryUpload(id)} onCancel={cancelUpload} />
    </section>
  );
}
