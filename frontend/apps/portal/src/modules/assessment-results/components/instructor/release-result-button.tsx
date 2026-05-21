export function ReleaseResultButton({ disabled, releasing, onRelease }: { disabled: boolean; releasing: boolean; onRelease: () => Promise<void> | void }) {
  return (
    <button
      className="rounded-full border border-portal-border bg-portal-text px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      data-testid="release-result-button"
      disabled={disabled || releasing}
      onClick={() => void onRelease()}
      type="button"
    >
      {releasing ? 'Releasing...' : 'Release result'}
    </button>
  );
}
