import { useEffect, useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clickElement, render, waitFor } from '@/testing';
import { useNotificationInbox, useNotificationPreferences } from '../hooks';

const mockArchiveNotification = vi.fn();
const mockGetPreferences = vi.fn();
const mockListNotifications = vi.fn();
const mockMarkNotificationRead = vi.fn();
const mockMarkNotificationUnread = vi.fn();
const mockUpdatePreference = vi.fn();

vi.mock('../api', () => ({
  archiveNotification: (...args: unknown[]) => mockArchiveNotification(...args),
  getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
  listNotifications: (...args: unknown[]) => mockListNotifications(...args),
  markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
  markNotificationUnread: (...args: unknown[]) => mockMarkNotificationUnread(...args),
  updatePreference: (...args: unknown[]) => mockUpdatePreference(...args),
}));

function InboxHookHarness() {
  const inbox = useNotificationInbox('ALL');

  return (
    <button
      data-testid="hook-mark-read"
      onClick={() => void inbox.markRead('notification-1')}
      type="button"
    >
      {String(inbox.unreadCount)}
    </button>
  );
}

function PreferencesHookHarness() {
  const preferences = useNotificationPreferences();
  const savedRef = useRef(false);

  useEffect(() => {
    const firstPreference = preferences.preferences[0];

    if (!savedRef.current && firstPreference) {
      savedRef.current = true;
      void preferences.savePreference(firstPreference, false);
    }
  }, [preferences]);

  return <div data-testid="preferences-hook">{preferences.preferences.length}</div>;
}

describe('communication center hooks', () => {
  beforeEach(() => {
    mockArchiveNotification.mockReset();
    mockGetPreferences.mockReset();
    mockListNotifications.mockReset();
    mockMarkNotificationRead.mockReset();
    mockMarkNotificationUnread.mockReset();
    mockUpdatePreference.mockReset();
  });

  it('calls the notification API when marking a notification as read', async () => {
    mockListNotifications.mockResolvedValue({
      items: [
        {
          id: 'notification-1',
          channel: 'IN_APP',
          recipient: { principalId: 'actor-1' },
          body: 'Body',
          priority: 'NORMAL',
          status: 'UNREAD',
          createdAt: '2026-05-22T10:00:00.000Z',
          updatedAt: '2026-05-22T10:00:00.000Z',
        },
      ],
      unreadCount: 1,
    });
    mockMarkNotificationRead.mockResolvedValue({
      id: 'notification-1',
      channel: 'IN_APP',
      recipient: { principalId: 'actor-1' },
      body: 'Body',
      priority: 'NORMAL',
      status: 'READ',
      readAt: '2026-05-22T10:05:00.000Z',
      createdAt: '2026-05-22T10:00:00.000Z',
      updatedAt: '2026-05-22T10:05:00.000Z',
    });

    const rendered = await render(<InboxHookHarness />);
    await waitFor(() => {
      expect(rendered.container.textContent).toContain('1');
    });

    const button = rendered.container.querySelector(
      '[data-testid="hook-mark-read"]',
    ) as HTMLElement;
    await clickElement(button);

    await waitFor(() => {
      expect(mockMarkNotificationRead).toHaveBeenCalledWith('notification-1');
    });
  });

  it('calls the notification preferences API when saving a toggle change', async () => {
    mockGetPreferences.mockResolvedValue({
      preferences: [
        {
          id: 'pref-1',
          channel: 'EMAIL',
          category: 'COURSE',
          enabled: true,
          createdAt: '2026-05-22T10:00:00.000Z',
          updatedAt: '2026-05-22T10:00:00.000Z',
        },
      ],
    });
    mockUpdatePreference.mockResolvedValue({
      id: 'pref-1',
      channel: 'EMAIL',
      category: 'COURSE',
      enabled: false,
      createdAt: '2026-05-22T10:00:00.000Z',
      updatedAt: '2026-05-22T10:05:00.000Z',
    });

    await render(<PreferencesHookHarness />);

    await waitFor(() => {
      expect(mockUpdatePreference).toHaveBeenCalledWith({
        category: 'COURSE',
        channel: 'EMAIL',
        enabled: false,
      });
    });
  });
});
