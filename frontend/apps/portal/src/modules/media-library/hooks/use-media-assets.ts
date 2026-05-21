'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MediaAssetContract, MediaAssetStatusContract, MediaFileCategoryContract } from '../types';
import { archiveMediaAsset, listMediaAssets } from '../api';

export function useMediaAssets(input?: {
  status?: MediaAssetStatusContract;
  fileCategory?: MediaFileCategoryContract;
  ownerPrincipalId?: string;
}) {
  const [assets, setAssets] = useState<MediaAssetContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setAssets(await listMediaAssets(input));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load media assets.');
    } finally {
      setLoading(false);
    }
  }, [input?.fileCategory, input?.ownerPrincipalId, input?.status]);

  const archiveAsset = useCallback(
    async (assetId: string) => {
      const archived = await archiveMediaAsset(assetId);
      setAssets((current) => current.map((asset) => (asset.id === assetId ? archived : asset)));
    },
    [],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { assets, loading, error, refresh, archiveAsset };
}
