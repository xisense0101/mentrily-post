import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clickElement, getByText, render, waitFor } from '@/testing';
import { NotificationPreferencesPage } from '../routes';

const mockUseNotificationPreferences = vi.fn();

vi.mock('../hooks', () => ({
  useNotificationPreferences: () => mockUseNotificationPreferences(),
}));

describe('NotificationPreferencesPage', () => {
  beforeEach(() => {
    mockUseNotificationPreferences.mockReset();
  });

  it('renders the preference form and saves a toggle update', async () => {
    const savePreference = vi.fn().mockResolvedValue(undefined);
    mockUseNotificationPreferences.mockReturnValue({
      error: undefined,
      loading: false,
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
      refresh: vi.fn(),
      savePreference,
      savingKey: null,
    });

    const rendered = await render(<NotificationPreferencesPage />);
    const toggle = rendered.container.querySelector(
      '[data-testid="preference-toggle-EMAIL:COURSE"]',
    ) as HTMLInputElement | null;
    expect(toggle).toBeTruthy();
    if (!toggle) {
      throw new Error('Missing email course preference toggle');
    }
    expect(toggle.checked).toBe(true);

    await clickElement(toggle);

    await waitFor(() => {
      expect(savePreference).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pref-1', channel: 'EMAIL', category: 'COURSE' }),
        false,
      );
    });
  });

  it('renders the loading state', async () => {
    mockUseNotificationPreferences.mockReturnValue({
      error: undefined,
      loading: true,
      preferences: [],
      refresh: vi.fn(),
      savePreference: vi.fn(),
      savingKey: null,
    });

    const rendered = await render(<NotificationPreferencesPage />);
    expect(rendered.container.querySelector('[data-testid="notification-skeleton"]')).toBeTruthy();
  });

  it('renders the error state', async () => {
    mockUseNotificationPreferences.mockReturnValue({
      error: 'Unable to load preferences.',
      loading: false,
      preferences: [],
      refresh: vi.fn(),
      savePreference: vi.fn(),
      savingKey: null,
    });

    const rendered = await render(<NotificationPreferencesPage />);
    expect(getByText(rendered.container, 'Notification center unavailable')).toBeTruthy();
  });
});
