'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  archiveNotification,
  listNotifications,
  markNotificationRead,
  markNotificationUnread,
} from '../api';
import type { NotificationInboxItem, NotificationInboxStatus } from '../types';

export function useNotificationInbox(initialStatus: NotificationInboxStatus | 'ALL' = 'ALL') {
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [status, setStatus] = useState<NotificationInboxStatus | 'ALL'>(initialStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await listNotifications({ status, limit: 50 });
      setItems(response.items);
      setUnreadCount(response.unreadCount);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async (notificationId: string, mutation: (id: string) => Promise<NotificationInboxItem>) => {
      setPendingId(notificationId);
      try {
        const updated = await mutation(notificationId);
        setItems((current) => {
          const next = current.map((item) => (item.id === notificationId ? updated : item));
          return updated.status === 'ARCHIVED' && status !== 'ARCHIVED'
            ? next.filter((item) => item.id !== notificationId)
            : next;
        });
        setUnreadCount((current) => {
          const existing = items.find((item) => item.id === notificationId);
          if (!existing) {
            return current;
          }
          if (existing.status === 'UNREAD' && updated.status !== 'UNREAD') {
            return Math.max(0, current - 1);
          }
          if (existing.status !== 'UNREAD' && updated.status === 'UNREAD') {
            return current + 1;
          }
          return current;
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Notification update failed.');
      } finally {
        setPendingId(null);
      }
    },
    [items, status],
  );

  return {
    items,
    status,
    loading,
    error,
    unreadCount,
    pendingId,
    setStatus,
    refresh,
    markRead: (notificationId: string) => runMutation(notificationId, markNotificationRead),
    markUnread: (notificationId: string) => runMutation(notificationId, markNotificationUnread),
    archive: (notificationId: string) => runMutation(notificationId, archiveNotification),
  };
}
