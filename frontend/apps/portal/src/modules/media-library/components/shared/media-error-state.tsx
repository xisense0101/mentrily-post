interface MediaErrorStateProps {
  message: string;
  onRetry?: (() => void) | undefined;
}

export function MediaErrorState({ message, onRetry }: MediaErrorStateProps) {
  return (
    <div
      data-testid="media-error-state"
      style={{ padding: '1rem', border: '1px solid #ef4444', borderRadius: '0.75rem', background: '#fff1f2' }}
    >
      <p style={{ margin: 0 }}>{message}</p>
      {onRetry ? (
        <button onClick={onRetry} style={{ marginTop: '0.75rem' }} type="button">
          Retry
        </button>
      ) : null}
    </div>
  );
}
