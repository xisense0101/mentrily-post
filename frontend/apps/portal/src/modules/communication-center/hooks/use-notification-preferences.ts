'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPreferences, updatePreference } from '../api';
import type { NotificationPreference } from '../types';

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await getPreferences();
      setPreferences(response.preferences);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load preferences.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savePreference = useCallback(
    async (preference: NotificationPreference, enabled: boolean) => {
      const key = `${preference.channel}:${preference.category}`;
      setSavingKey(key);
      setError(undefined);
      try {
        const updated = await updatePreference({
          channel: preference.channel,
          category: preference.category,
          enabled,
        });
        setPreferences((current) =>
          current.map((item) => (item.id === preference.id ? updated : item)),
        );
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to update preference.');
      } finally {
        setSavingKey(null);
      }
    },
    [],
  );

  return {
    preferences,
    loading,
    error,
    savingKey,
    refresh,
    savePreference,
  };
}
