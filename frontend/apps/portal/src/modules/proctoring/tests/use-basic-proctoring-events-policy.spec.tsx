/**
 * Tests for useBasicProctoringEvents policy enforcement (014I).
 * Verifies strict category-based listener attachment.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBasicProctoringEvents } from '../hooks/use-basic-proctoring-events';

describe('useBasicProctoringEvents — policy enforcement', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not attach any listeners when enabled=false', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const docSpy = vi.spyOn(document, 'addEventListener');
    const onRecord = vi.fn();

    renderHook(() =>
      useBasicProctoringEvents({
        enabled: false,
        trackFocusChanges: true,
        trackVisibilityChanges: true,
        onRecord,
      }),
    );

    const windowEvents = addSpy.mock.calls.map((c) => c[0]);
    const docEvents = docSpy.mock.calls.map((c) => c[0]);

    // Our hook-specific events must not be attached
    expect(windowEvents).not.toContain('blur');
    expect(windowEvents).not.toContain('focus');
    expect(windowEvents).not.toContain('online');
    expect(windowEvents).not.toContain('offline');
    expect(docEvents).not.toContain('visibilitychange');
    expect(docEvents).not.toContain('fullscreenchange');
    expect(docEvents).not.toContain('copy');
    expect(docEvents).not.toContain('paste');
  });

  it('attaches focus listeners only when trackFocusChanges=true', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const onRecord = vi.fn();

    renderHook(() =>
      useBasicProctoringEvents({
        enabled: true,
        trackFocusChanges: true,
        trackVisibilityChanges: false,
        trackFullscreenChanges: false,
        trackCopyPasteAttempts: false,
        trackNetworkStatus: false,
        onRecord,
      }),
    );

    const eventNames = addSpy.mock.calls.map((c) => c[0]);
    expect(eventNames).toContain('blur');
    expect(eventNames).toContain('focus');
    expect(eventNames).not.toContain('online');
    expect(eventNames).not.toContain('offline');
  });

  it('does NOT attach focus listeners when trackFocusChanges=false', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const onRecord = vi.fn();

    renderHook(() =>
      useBasicProctoringEvents({
        enabled: true,
        trackFocusChanges: false,
        onRecord,
      }),
    );

    const eventNames = addSpy.mock.calls.map((c) => c[0]);
    expect(eventNames).not.toContain('blur');
    expect(eventNames).not.toContain('focus');
  });

  it('does NOT attach focus listeners when trackFocusChanges is undefined (strict enforcement)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const onRecord = vi.fn();

    renderHook(() =>
      useBasicProctoringEvents({
        enabled: true,
        // trackFocusChanges omitted — strict check means no listener attached
        onRecord,
      }),
    );

    const eventNames = addSpy.mock.calls.map((c) => c[0]);
    expect(eventNames).not.toContain('blur');
    expect(eventNames).not.toContain('focus');
  });

  it('attaches visibility listener only when trackVisibilityChanges=true', () => {
    const docSpy = vi.spyOn(document, 'addEventListener');
    const onRecord = vi.fn();

    renderHook(() =>
      useBasicProctoringEvents({
        enabled: true,
        trackVisibilityChanges: true,
        trackFullscreenChanges: false,
        trackCopyPasteAttempts: false,
        onRecord,
      }),
    );

    const eventNames = docSpy.mock.calls.map((c) => c[0]);
    expect(eventNames).toContain('visibilitychange');
    expect(eventNames).not.toContain('fullscreenchange');
  });

  it('attaches fullscreen listener only when trackFullscreenChanges=true', () => {
    const docSpy = vi.spyOn(document, 'addEventListener');
    const onRecord = vi.fn();

    renderHook(() =>
      useBasicProctoringEvents({
        enabled: true,
        trackFullscreenChanges: true,
        trackVisibilityChanges: false,
        trackCopyPasteAttempts: false,
        onRecord,
      }),
    );

    const eventNames = docSpy.mock.calls.map((c) => c[0]);
    expect(eventNames).toContain('fullscreenchange');
    expect(eventNames).not.toContain('visibilitychange');
  });

  it('attaches copy/paste listeners only when trackCopyPasteAttempts=true', () => {
    const docSpy = vi.spyOn(document, 'addEventListener');
    const onRecord = vi.fn();

    renderHook(() =>
      useBasicProctoringEvents({
        enabled: true,
        trackCopyPasteAttempts: true,
        trackVisibilityChanges: false,
        trackFullscreenChanges: false,
        onRecord,
      }),
    );

    const eventNames = docSpy.mock.calls.map((c) => c[0]);
    expect(eventNames).toContain('copy');
    expect(eventNames).toContain('paste');
  });

  it('attaches network listeners only when trackNetworkStatus=true', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const onRecord = vi.fn();

    renderHook(() =>
      useBasicProctoringEvents({
        enabled: true,
        trackNetworkStatus: true,
        trackFocusChanges: false,
        onRecord,
      }),
    );

    const eventNames = addSpy.mock.calls.map((c) => c[0]);
    expect(eventNames).toContain('online');
    expect(eventNames).toContain('offline');
  });

  it('copy listener sends metadata without clipboard content', () => {
    const docSpy = vi.spyOn(document, 'addEventListener');
    const onRecord = vi.fn();

    renderHook(() =>
      useBasicProctoringEvents({
        enabled: true,
        trackCopyPasteAttempts: true,
        onRecord,
      }),
    );

    // Find the copy handler and fire it
    const copyCall = docSpy.mock.calls.find((c) => c[0] === 'copy');
    expect(copyCall).toBeTruthy();
    const copyHandler = copyCall![1] as () => void;
    copyHandler();

    const recorded = onRecord.mock.calls[0]?.[0];
    expect(recorded.eventType).toBe('COPY_ATTEMPTED');
    // Metadata must NOT contain clipboard content
    expect(recorded.metadata?.content).toBeUndefined();
    expect(recorded.metadata?.text).toBeUndefined();
    // Must have safe timestamp metadata
    expect(recorded.metadata?.clientTime).toBeDefined();
    expect(recorded.metadata?.sequence).toBeDefined();
  });

  it('cleans up all listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const docRemoveSpy = vi.spyOn(document, 'removeEventListener');
    const onRecord = vi.fn();

    const { unmount } = renderHook(() =>
      useBasicProctoringEvents({
        enabled: true,
        trackFocusChanges: true,
        trackNetworkStatus: true,
        trackVisibilityChanges: true,
        trackFullscreenChanges: true,
        trackCopyPasteAttempts: true,
        onRecord,
      }),
    );

    unmount();

    const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
    const docRemovedEvents = docRemoveSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain('blur');
    expect(removedEvents).toContain('focus');
    expect(removedEvents).toContain('online');
    expect(removedEvents).toContain('offline');
    expect(docRemovedEvents).toContain('visibilitychange');
    expect(docRemovedEvents).toContain('fullscreenchange');
    expect(docRemovedEvents).toContain('copy');
    expect(docRemovedEvents).toContain('paste');
  });
});
