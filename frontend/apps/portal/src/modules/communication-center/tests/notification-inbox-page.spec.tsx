import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getByText, render } from '@/testing';
import { NotificationInboxPage } from '../routes';

const mockUseNotificationInbox = vi.fn();

vi.mock('../hooks', () => ({
  useNotificationInbox: () => mockUseNotificationInbox(),
}));

describe('NotificationInboxPage', () => {
  beforeEach(() => {
    mockUseNotificationInbox.mockReset();
  });

  it('renders the loading state', async () => {
    mockUseNotificationInbox.mockReturnValue({
      archive: vi.fn(),
      error: undefined,
      items: [],
      loading: true,
      markRead: vi.fn(),
      markUnread: vi.fn(),
      pendingId: null,
      refresh: vi.fn(),
      setStatus: vi.fn(),
      status: 'ALL',
      unreadCount: 0,
    });

    const rendered = await render(<NotificationInboxPage />);
    expect(rendered.container.querySelector('[data-testid="notification-skeleton"]')).toBeTruthy();
  });

  it('renders notifications and the unread badge', async () => {
    mockUseNotificationInbox.mockReturnValue({
      archive: vi.fn(),
      error: undefined,
      items: [
        {
          id: 'notification-1',
          channel: 'IN_APP',
          recipient: { principalId: 'actor-1' },
          subject: 'Assessment ready',
          body: 'Your next assessment is available.',
          priority: 'NORMAL',
          status: 'UNREAD',
          createdAt: '2026-05-22T10:00:00.000Z',
          updatedAt: '2026-05-22T10:00:00.000Z',
        },
      ],
      loading: false,
      markRead: vi.fn(),
      markUnread: vi.fn(),
      pendingId: null,
      refresh: vi.fn(),
      setStatus: vi.fn(),
      status: 'ALL',
      unreadCount: 1,
    });

    const rendered = await render(<NotificationInboxPage />);
    expect(getByText(rendered.container, 'Assessment ready')).toBeTruthy();
    expect(getByText(rendered.container, '1 unread')).toBeTruthy();
    expect(
      rendered.container.querySelector('[data-testid="toggle-read-notification-1"]'),
    ).toBeTruthy();
  });

  it('renders the empty state', async () => {
    mockUseNotificationInbox.mockReturnValue({
      archive: vi.fn(),
      error: undefined,
      items: [],
      loading: false,
      markRead: vi.fn(),
      markUnread: vi.fn(),
      pendingId: null,
      refresh: vi.fn(),
      setStatus: vi.fn(),
      status: 'ALL',
      unreadCount: 0,
    });

    const rendered = await render(<NotificationInboxPage />);
    expect(getByText(rendered.container, 'No notifications yet')).toBeTruthy();
  });

  it('renders the error state', async () => {
    mockUseNotificationInbox.mockReturnValue({
      archive: vi.fn(),
      error: 'Unable to load notifications.',
      items: [],
      loading: false,
      markRead: vi.fn(),
      markUnread: vi.fn(),
      pendingId: null,
      refresh: vi.fn(),
      setStatus: vi.fn(),
      status: 'ALL',
      unreadCount: 0,
    });

    const rendered = await render(<NotificationInboxPage />);
    expect(getByText(rendered.container, 'Notification center unavailable')).toBeTruthy();
  });
});
