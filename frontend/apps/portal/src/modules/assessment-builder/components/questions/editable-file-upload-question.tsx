'use client';

import { useMemo, useState } from 'react';
import type { MediaFileCategoryContract } from '@/modules/media-library';
import {
  AssetPickerDialog,
  MediaUploadWidget,
  useMediaAssets,
  useMediaUpload,
} from '@/modules/media-library';
import { Input } from '@mentrily/ui-system';
import type { AssessmentQuestionContract } from '../../types';
import { QuestionShell } from './question-shell';

const FILE_CATEGORIES: MediaFileCategoryContract[] = [
  'DOCUMENT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'ARCHIVE',
  'OTHER',
];

interface EditableFileUploadQuestionProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
}

function toMegabytes(bytes: number | undefined): string {
  return typeof bytes === 'number' && bytes > 0 ? String(Math.round(bytes / (1024 * 1024))) : '';
}

export function EditableFileUploadQuestion({
  question,
  onUpdate,
  onRemove,
  readonly,
}: EditableFileUploadQuestionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { assets, loading } = useMediaAssets({ status: 'AVAILABLE' });
  const attachments = question.attachments ?? [];
  const fileUploadConfig = question.fileUploadConfig ?? {};
  const allowedCategories = fileUploadConfig.allowedFileCategories ?? [];
  const attachmentAssetIds = useMemo(
    () => new Set(attachments.map((attachment) => attachment.mediaAssetId)),
    [attachments],
  );
  const upload = useMediaUpload({
    ...(typeof fileUploadConfig.maxFileSizeBytes === 'number'
      ? { maxSizeBytes: fileUploadConfig.maxFileSizeBytes }
      : {}),
    ...(allowedCategories.length > 0 ? { allowedCategories } : {}),
    createUploadIntentInput: () => ({
      visibility: 'WORKSPACE',
      metadata: {
        assessmentUsage: 'ASSESSMENT_QUESTION_ATTACHMENT',
        assessmentQuestionId: question.id,
      },
    }),
    onAssetsChanged: (newAssets) => {
      const nextAttachments = [
        ...attachments,
        ...newAssets
          .filter((asset) => !attachmentAssetIds.has(asset.id))
          .map((asset) => ({
            mediaAssetId: asset.id,
            filename: asset.filename,
            contentType: asset.contentType,
            fileCategory: asset.fileCategory,
            sizeBytes: asset.sizeBytes,
            status: asset.status,
          })),
      ];
      onUpdate?.({ attachments: nextAttachments, gradingMode: 'MANUAL' });
    },
  });

  return (
    <QuestionShell onRemove={onRemove} onUpdate={onUpdate} question={question} readonly={readonly}>
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p className="font-semibold">Media Library backed file upload</p>
        <p className="mt-1 text-sky-900">
          Learners submit Media Library assets by reference. Assessment records store stable media
          asset IDs instead of raw files.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Allowed file categories</p>
          <div className="flex flex-wrap gap-2">
            {FILE_CATEGORIES.map((category) => {
              const checked = allowedCategories.includes(category);
              return (
                <label
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  key={category}
                >
                  <input
                    checked={checked}
                    disabled={readonly}
                    onChange={(event) => {
                      const nextCategories = event.target.checked
                        ? [...allowedCategories, category]
                        : allowedCategories.filter((item) => item !== category);

                      onUpdate?.({
                        fileUploadConfig: {
                          ...fileUploadConfig,
                          allowedFileCategories: nextCategories,
                        },
                        gradingMode: 'MANUAL',
                      });
                    }}
                    type="checkbox"
                  />
                  {category.toLowerCase()}
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Max files</label>
            <Input
              disabled={readonly}
              inputMode="numeric"
              onChange={(event) =>
                onUpdate?.({
                  fileUploadConfig: {
                    ...fileUploadConfig,
                    maxFiles:
                      event.target.value.trim().length > 0 ? Number(event.target.value) : undefined,
                  },
                  gradingMode: 'MANUAL',
                })
              }
              placeholder="e.g. 3"
              value={
                typeof fileUploadConfig.maxFiles === 'number' ? String(fileUploadConfig.maxFiles) : ''
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Max file size (MB)</label>
            <Input
              disabled={readonly}
              inputMode="numeric"
              onChange={(event) =>
                onUpdate?.({
                  fileUploadConfig: {
                    ...fileUploadConfig,
                    maxFileSizeBytes:
                      event.target.value.trim().length > 0
                        ? Number(event.target.value) * 1024 * 1024
                        : undefined,
                  },
                  gradingMode: 'MANUAL',
                })
              }
              placeholder="e.g. 25"
              value={toMegabytes(fileUploadConfig.maxFileSizeBytes)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button disabled={readonly} onClick={() => setPickerOpen(true)} type="button">
              Pick media
            </button>
            <button disabled={readonly} onClick={() => setUploadOpen((current) => !current)} type="button">
              {uploadOpen ? 'Hide uploader' : 'Upload media'}
            </button>
          </div>
          {loading ? <p className="text-sm text-slate-500">Loading workspace media...</p> : null}
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500">No prompt attachments linked yet.</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                  key={attachment.mediaAssetId}
                >
                  <div>
                    <p className="font-medium text-slate-900">{attachment.filename}</p>
                    <p className="text-slate-500">
                      {attachment.fileCategory} · {attachment.contentType}
                    </p>
                  </div>
                  <button
                    disabled={readonly}
                    onClick={() =>
                      onUpdate?.({
                        attachments: attachments.filter(
                          (item) => item.mediaAssetId !== attachment.mediaAssetId,
                        ),
                      })
                    }
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {uploadOpen ? (
          <MediaUploadWidget
            addFiles={upload.addFiles}
            cancelUpload={upload.cancelUpload}
            clearCompleted={upload.clearCompleted}
            error={upload.error}
            items={upload.items}
            retryUpload={upload.retryUpload}
            startUpload={upload.startUpload}
            uploading={upload.uploading}
          />
        ) : null}
      </div>

      <AssetPickerDialog
        {...(allowedCategories.length > 0 ? { allowedCategories } : {})}
        assets={assets.filter((asset) => !attachmentAssetIds.has(asset.id))}
        onOpenChange={setPickerOpen}
        onSelect={(selectedAssets) =>
          onUpdate?.({
            attachments: [
              ...attachments,
              ...selectedAssets.map((asset) => ({
                mediaAssetId: asset.id,
                filename: asset.filename,
                contentType: asset.contentType,
                fileCategory: asset.fileCategory,
                sizeBytes: asset.sizeBytes,
                status: asset.status,
              })),
            ],
            gradingMode: 'MANUAL',
          })
        }
        open={pickerOpen}
        selectionMode="multiple"
      />
    </QuestionShell>
  );
}
