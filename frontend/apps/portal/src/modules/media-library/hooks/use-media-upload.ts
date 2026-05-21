'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  completeMediaUpload,
  createMediaUploadIntent,
  uploadFileToSignedUrl,
} from '../api';
import type { MediaAssetContract, MediaFileCategoryContract, MediaUploadQueueItem } from '../types';
import {
  createUploadQueueItem,
  updateUploadQueueItemProgress,
  validateMediaFileForUpload,
} from '../state';

interface UseMediaUploadOptions {
  maxSizeBytes?: number;
  allowedCategories?: MediaFileCategoryContract[];
  onAssetsChanged?: (assets: MediaAssetContract[]) => void;
}

export function useMediaUpload(options: UseMediaUploadOptions = {}) {
  const [items, setItems] = useState<MediaUploadQueueItem[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const validationOptions = useMemo(
    () => ({
      ...(options.maxSizeBytes !== undefined ? { maxSizeBytes: options.maxSizeBytes } : {}),
      ...(options.allowedCategories ? { allowedCategories: options.allowedCategories } : {}),
    }),
    [options.allowedCategories, options.maxSizeBytes],
  );

  const uploading = useMemo(
    () => items.some((item) => item.status === 'UPLOADING' || item.status === 'VALIDATING' || item.status === 'COMPLETING'),
    [items],
  );

  const patchItem = useCallback((itemId: string, updater: (item: MediaUploadQueueItem) => MediaUploadQueueItem) => {
    setItems((current) => current.map((item) => (item.id === itemId ? updater(item) : item)));
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      const next = files.map((file) => {
        const validation = validateMediaFileForUpload({
          file,
          ...validationOptions,
        });
        const item = createUploadQueueItem(file);
        return validation.valid
          ? { ...item, status: 'READY' as const, fileCategory: validation.fileCategory ?? item.fileCategory }
          : {
              ...item,
              status: 'FAILED' as const,
              fileCategory: validation.fileCategory ?? item.fileCategory,
              error: validation.message ?? 'File cannot be uploaded.',
            };
      });
      setItems((current) => [...next, ...current]);
    },
    [validationOptions],
  );

  const executeUpload = useCallback(
    async (itemId: string) => {
      const item = items.find((candidate) => candidate.id === itemId);
      if (!item) return;

      const validation = validateMediaFileForUpload({
        file: item.file,
        ...validationOptions,
      });

      if (!validation.valid) {
        patchItem(itemId, (current) => ({ ...current, status: 'FAILED', error: validation.message }));
        return;
      }

      const abortController = new AbortController();
      controllersRef.current.set(itemId, abortController);
      patchItem(itemId, (current) => ({
        ...current,
        status: 'VALIDATING',
        error: undefined,
        progress: { loadedBytes: 0, totalBytes: current.file.size, percent: 0 },
      }));

      try {
        const uploadIntent = await createMediaUploadIntent({
          filename: item.file.name,
          contentType: item.file.type || 'application/octet-stream',
          fileCategory: validation.fileCategory ?? item.fileCategory,
          maxSizeBytes: item.file.size,
        });

        patchItem(itemId, (current) => ({
          ...current,
          uploadIntent,
          fileCategory: uploadIntent.fileCategory,
          status: 'UPLOADING',
        }));

        await uploadFileToSignedUrl({
          file: item.file,
          uploadUrl: uploadIntent.uploadUrl,
          method: uploadIntent.uploadMethod,
          headers: uploadIntent.headers,
          signal: abortController.signal,
          onProgress: (progress) => {
            patchItem(itemId, (current) => ({
              ...updateUploadQueueItemProgress({
                item: current,
                loadedBytes: progress.loadedBytes,
                totalBytes: progress.totalBytes,
              }),
              status: 'UPLOADING',
            }));
          },
        });

        patchItem(itemId, (current) => ({
          ...current,
          status: 'COMPLETING',
          progress: { loadedBytes: current.file.size, totalBytes: current.file.size, percent: 100 },
        }));

        const asset = await completeMediaUpload(uploadIntent.id, { sizeBytes: item.file.size });
        patchItem(itemId, (current) => ({ ...current, asset, status: 'COMPLETED' }));
        options.onAssetsChanged?.([asset]);
      } catch (caught) {
        const isAbort = caught instanceof DOMException && caught.name === 'AbortError';
        patchItem(itemId, (current) => ({
          ...current,
          status: isAbort ? 'CANCELLED' : 'FAILED',
          error: isAbort ? 'Upload cancelled.' : caught instanceof Error ? caught.message : 'Upload failed.',
        }));
        if (!isAbort) {
          setError(caught instanceof Error ? caught.message : 'Upload failed.');
        }
      } finally {
        controllersRef.current.delete(itemId);
      }
    },
    [items, options.onAssetsChanged, patchItem, validationOptions],
  );

  const startUpload = useCallback(async () => {
    setError(undefined);
    const readyItems = items.filter((item) => item.status === 'READY' || item.status === 'FAILED' || item.status === 'CANCELLED');
    for (const item of readyItems) {
      await executeUpload(item.id);
    }
  }, [executeUpload, items]);

  const retryUpload = useCallback(
    async (itemId: string) => {
      setError(undefined);
      await executeUpload(itemId);
    },
    [executeUpload],
  );

  const cancelUpload = useCallback((itemId: string) => {
    controllersRef.current.get(itemId)?.abort();
    patchItem(itemId, (current) => ({ ...current, status: 'CANCELLED', error: 'Upload cancelled.' }));
  }, [patchItem]);

  const clearCompleted = useCallback(() => {
    setItems((current) => current.filter((item) => item.status !== 'COMPLETED'));
  }, []);

  return { items, uploading, error, addFiles, startUpload, retryUpload, cancelUpload, clearCompleted };
}
