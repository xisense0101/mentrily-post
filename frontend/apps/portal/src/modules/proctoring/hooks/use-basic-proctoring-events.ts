'use client';

import { useEffect } from 'react';

/**
 * Attaches metadata-only browser event listeners for basic proctoring monitoring.
 *
 * Only categories explicitly enabled by the policy are tracked.
 * No clipboard contents, raw keystrokes, webcam, screen, or audio are collected.
 * Listeners are cleaned up reliably on unmount or dependency change.
 */
export function useBasicProctoringEvents({
  enabled,
  trackFocusChanges,
  trackVisibilityChanges,
  trackFullscreenChanges,
  trackCopyPasteAttempts,
  trackNetworkStatus,
  onRecord,
}: {
  /** Master switch — set false (or leave out) when monitoring is OFF or session is not active */
  enabled: boolean;
  /** Explicitly enable focus change tracking (WINDOW_BLUR / WINDOW_FOCUS) */
  trackFocusChanges?: boolean;
  /** Explicitly enable visibility change tracking (VISIBILITY_HIDDEN / VISIBILITY_VISIBLE) */
  trackVisibilityChanges?: boolean;
  /** Explicitly enable fullscreen change tracking (FULLSCREEN_EXITED / FULLSCREEN_ENTERED) */
  trackFullscreenChanges?: boolean;
  /** Explicitly enable copy/paste attempt tracking (COPY_ATTEMPTED / PASTE_ATTEMPTED) */
  trackCopyPasteAttempts?: boolean;
  /** Explicitly enable network status tracking (NETWORK_OFFLINE / NETWORK_ONLINE) */
  trackNetworkStatus?: boolean;
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

    // Strict explicit check — only attach if the policy explicitly enables the category.
    // Previously used !== false (permissive default). Now uses === true (strict enforcement).
    if (trackFocusChanges === true) {
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);
    }
    if (trackNetworkStatus === true) {
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
    }
    if (trackVisibilityChanges === true) {
      document.addEventListener('visibilitychange', onVisibility);
    }
    if (trackFullscreenChanges === true) {
      document.addEventListener('fullscreenchange', onFullscreen);
    }
    if (trackCopyPasteAttempts === true) {
      document.addEventListener('copy', onCopy);
      document.addEventListener('paste', onPaste);
    }

    // Always clean up all listeners regardless of whether they were attached
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
  }, [
    enabled,
    onRecord,
    trackCopyPasteAttempts,
    trackFocusChanges,
    trackFullscreenChanges,
    trackNetworkStatus,
    trackVisibilityChanges,
  ]);
}
