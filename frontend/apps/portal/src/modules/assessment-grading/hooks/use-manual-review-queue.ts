'use client';

import { useCallback, useEffect, useState } from 'react';
import { assessmentGradingApiClient } from '../api';
import type { AssessmentManualReviewItemContract } from '../types';

export function useManualReviewQueue() {
  const [items, setItems] = useState<AssessmentManualReviewItemContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await assessmentGradingApiClient.listPendingManualReview());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load manual review queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
