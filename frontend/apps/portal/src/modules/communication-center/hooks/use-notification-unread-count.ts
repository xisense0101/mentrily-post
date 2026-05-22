'use client';

import { useCallback, useEffect, useState } from 'react';
import { getUnreadCount } from '../api';

export function useNotificationUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load unread count.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { unreadCount, loading, error, refresh, setUnreadCount };
}
