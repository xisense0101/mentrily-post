'use client';

import { useCallback, useState } from 'react';
import type { MediaReadUrlContract } from '../types';
import { createMediaReadUrl } from '../api';

export function useMediaReadUrl() {
  const [readUrl, setReadUrl] = useState<MediaReadUrlContract | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const loadReadUrl = useCallback(async (assetId: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const value = await createMediaReadUrl(assetId);
      setReadUrl(value);
      return value;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create read URL.');
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearReadUrl = useCallback(() => {
    setReadUrl(undefined);
    setError(undefined);
  }, []);

  return { readUrl, loading, error, loadReadUrl, clearReadUrl };
}
