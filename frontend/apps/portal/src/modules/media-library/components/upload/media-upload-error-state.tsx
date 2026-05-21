interface MediaUploadErrorStateProps {
  message: string;
}

export function MediaUploadErrorState({ message }: MediaUploadErrorStateProps) {
  return (
    <div
      data-testid="media-upload-error-state"
      style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', background: '#fff1f2', color: '#b91c1c' }}
    >
      {message}
    </div>
  );
}
