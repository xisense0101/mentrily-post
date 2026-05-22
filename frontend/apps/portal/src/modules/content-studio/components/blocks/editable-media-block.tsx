'use client';

import { useEffect, useState } from 'react';
import type { ContentBlockContract } from '../../types';
import { AssetPickerDialog, useMediaAssets, useMediaReadUrl } from '@/modules/media-library';
import { Button } from '@mentrily/ui-system';

interface EditableMediaBlockProps {
  block: ContentBlockContract;
  editable: boolean;
  onChange: (content: Record<string, unknown>) => void;
}

export function EditableMediaBlock({ block, editable, onChange }: EditableMediaBlockProps) {
  const mediaAssetId = (block.content?.mediaAssetId as string | undefined) ?? '';
  const [pickerOpen, setPickerOpen] = useState(false);
  const { assets } = useMediaAssets({ status: 'AVAILABLE' });
  const { readUrl, loadReadUrl, clearReadUrl, error, loading } = useMediaReadUrl();

  useEffect(() => {
    if (mediaAssetId) {
      void loadReadUrl(mediaAssetId);
    } else {
      clearReadUrl();
    }
  }, [mediaAssetId, loadReadUrl, clearReadUrl]);

  const allowedCategories: ('DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'ARCHIVE' | 'OTHER')[] | undefined =
    block.kind === 'IMAGE' ? ['IMAGE'] : block.kind === 'VIDEO' ? ['VIDEO'] : undefined;

  return (
    <div className="space-y-4" data-testid={`media-block-${block.kind.toLowerCase()}`}>
      {editable ? (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setPickerOpen(true)}
            data-testid={`media-block-picker-trigger-${block.id}`}
          >
            {mediaAssetId ? 'Change media' : 'Select from Media Library'}
          </Button>
          {mediaAssetId ? (
            <span className="text-xs text-slate-500">Asset ID: {mediaAssetId}</span>
          ) : (
            <span className="text-xs text-amber-600">No asset selected</span>
          )}
        </div>
      ) : null}

      <div className="media-preview-container">
        {loading ? (
          <p className="text-sm text-slate-500">Loading media url...</p>
        ) : error ? (
          <p className="text-sm text-rose-600">Failed to load media preview: {error}</p>
        ) : readUrl ? (
          block.kind === 'IMAGE' ? (
            <img
              src={readUrl.url}
              alt="Content Media"
              className="max-h-[400px] w-auto rounded-xl object-contain"
              data-testid="media-block-image"
            />
          ) : block.kind === 'VIDEO' ? (
            <video
              src={readUrl.url}
              controls
              className="w-full max-w-[600px] rounded-xl"
              data-testid="media-block-video"
            />
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-sm text-slate-700 font-medium">Attachment File:</span>
              <a
                href={readUrl.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-indigo-600 hover:underline"
                data-testid="media-block-file-link"
              >
                Download or view file
              </a>
            </div>
          )
        ) : (
          !editable && <p className="text-sm text-slate-400 italic">No media asset configured.</p>
        )}
      </div>

      {editable && (
        <AssetPickerDialog
          {...(allowedCategories ? { allowedCategories } : {})}
          assets={assets}
          onOpenChange={setPickerOpen}
          onSelect={(selected) => {
            const first = selected?.[0];
            if (first) {
              onChange({ mediaAssetId: first.id });
            }
          }}
          open={pickerOpen}
          selectionMode="single"
        />
      )}
    </div>
  );
}
