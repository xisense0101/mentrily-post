import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaUploadWidget } from '../components/upload';
import type { MediaUploadQueueItem } from '../types';

function makeItem(status: MediaUploadQueueItem['status'] = 'READY', id = `item_${status}`): MediaUploadQueueItem {
  const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
  return {
    id,
    file,
    fileCategory: 'DOCUMENT',
    status,
    progress: { loadedBytes: 5, totalBytes: 10, percent: 50 },
    error: status === 'FAILED' ? 'Upload failed.' : undefined,
  };
}

describe('MediaUploadWidget', () => {
  it('renders selected files and starts uploads', () => {
    const startUpload = vi.fn().mockResolvedValue(undefined);
    const addFiles = vi.fn();

    render(
      <MediaUploadWidget
        items={[makeItem()]}
        uploading={false}
        addFiles={addFiles}
        startUpload={startUpload}
        retryUpload={vi.fn().mockResolvedValue(undefined)}
        cancelUpload={vi.fn()}
        clearCompleted={vi.fn()}
      />,
    );

    expect(screen.getByText('hello.txt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('media-upload-start-button'));
    expect(startUpload).toHaveBeenCalled();
  });

  it('shows validation errors, progress, retry, and cancel controls', () => {
    const retryUpload = vi.fn().mockResolvedValue(undefined);
    const cancelUpload = vi.fn();

    render(
      <MediaUploadWidget
        items={[makeItem('FAILED', 'item_failed'), makeItem('UPLOADING', 'item_uploading')]}
        uploading={true}
        error="Something failed."
        addFiles={vi.fn()}
        startUpload={vi.fn().mockResolvedValue(undefined)}
        retryUpload={retryUpload}
        cancelUpload={cancelUpload}
        clearCompleted={vi.fn()}
      />,
    );

    expect(screen.getByTestId('media-upload-error-state')).toBeInTheDocument();
    expect(screen.getAllByTestId('media-upload-progress')[0]).toHaveTextContent('50%');
    fireEvent.click(screen.getByTestId('media-upload-retry-button'));
    fireEvent.click(screen.getByTestId('media-upload-cancel-button'));
    expect(retryUpload).toHaveBeenCalled();
    expect(cancelUpload).toHaveBeenCalled();
  });

  it('accepts file input selection', () => {
    const addFiles = vi.fn();
    render(
      <MediaUploadWidget
        items={[]}
        uploading={false}
        addFiles={addFiles}
        startUpload={vi.fn().mockResolvedValue(undefined)}
        retryUpload={vi.fn().mockResolvedValue(undefined)}
        cancelUpload={vi.fn()}
        clearCompleted={vi.fn()}
      />,
    );
    const input = screen.getByTestId('media-file-input') as HTMLInputElement;
    const file = new File(['sample'], 'sample.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(addFiles).toHaveBeenCalledWith([file]);
  });
});
