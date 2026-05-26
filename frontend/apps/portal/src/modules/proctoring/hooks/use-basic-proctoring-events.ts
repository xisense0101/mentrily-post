'use client';

import { useEffect } from 'react';

export function useBasicProctoringEvents({
  enabled,
  onRecord,
}: {
  enabled: boolean;
  onRecord: (event: { eventType: string; metadata?: Record<string, unknown> }) => void;
}) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    let sequence = 0;
    const nextMetadata = (): Record<string, unknown> => ({
      clientTime: new Date().toISOString(),
      sequence: sequence++,
    });

    const onBlur = () => onRecord({ eventType: 'WINDOW_BLUR', metadata: nextMetadata() });
    const onFocus = () => onRecord({ eventType: 'WINDOW_FOCUS', metadata: nextMetadata() });
    const onVisibility = () =>
      onRecord({
        eventType:
          document.visibilityState === 'hidden' ? 'VISIBILITY_HIDDEN' : 'VISIBILITY_VISIBLE',
        metadata: nextMetadata(),
      });
    const onFullscreen = () =>
      onRecord({
        eventType: document.fullscreenElement ? 'FULLSCREEN_ENTERED' : 'FULLSCREEN_EXITED',
        metadata: nextMetadata(),
      });
    const onOnline = () => onRecord({ eventType: 'NETWORK_ONLINE', metadata: nextMetadata() });
    const onOffline = () => onRecord({ eventType: 'NETWORK_OFFLINE', metadata: nextMetadata() });
    const onCopy = () => onRecord({ eventType: 'COPY_ATTEMPTED', metadata: nextMetadata() });
    const onPaste = () => onRecord({ eventType: 'PASTE_ATTEMPTED', metadata: nextMetadata() });

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
    };
  }, [enabled, onRecord]);
}
