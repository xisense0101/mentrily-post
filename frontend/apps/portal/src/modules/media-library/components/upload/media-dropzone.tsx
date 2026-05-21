'use client';

import { useRef } from 'react';

interface MediaDropzoneProps {
  onFilesSelected(files: File[]): void;
}

export function MediaDropzone({ onFilesSelected }: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      data-testid="media-dropzone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFilesSelected(Array.from(event.dataTransfer.files));
      }}
      style={{
        border: '2px dashed #94a3b8',
        borderRadius: '1rem',
        padding: '1.25rem',
        background: '#f8fafc',
      }}
    >
      <p style={{ marginTop: 0 }}>Drag files here or choose files to prepare an upload.</p>
      <input
        data-testid="media-file-input"
        ref={inputRef}
        type="file"
        multiple
        onChange={(event) => onFilesSelected(Array.from(event.target.files ?? []))}
      />
      <button style={{ marginTop: '0.75rem' }} type="button" onClick={() => inputRef.current?.click()}>
        Choose files
      </button>
    </div>
  );
}
