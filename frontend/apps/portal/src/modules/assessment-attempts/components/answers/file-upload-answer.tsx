'use client';

import { useMemo, useState } from 'react';
import {
  MediaUploadWidget,
  useMediaUpload,
} from '@/modules/media-library';
import type {
  AssessmentQuestionContract,
  AssessmentSubmittedFileContract,
} from '../../types';
import { createAssessmentAttemptAnswerFileReadUrl } from '../../api';

interface FileUploadAnswerProps {
  assessmentId: string;
  attemptId: string;
  answerId?: string | undefined;
  question: AssessmentQuestionContract;
  disabled: boolean;
  value: string[];
  submittedFiles?: AssessmentSubmittedFileContract[] | undefined;
  onChange(value: string[]): void;
}

export function FileUploadAnswer({
  assessmentId,
  attemptId,
  answerId,
  question,
  disabled,
  value,
  submittedFiles,
  onChange,
}: FileUploadAnswerProps) {
  const [downloadError, setDownloadError] = useState<string | undefined>(undefined);
  const currentFiles = submittedFiles ?? [];
  const currentFileIds = useMemo(
    () => new Set(currentFiles.map((file) => file.mediaAssetId)),
    [currentFiles],
  );
  const upload = useMediaUpload({
    ...(typeof question.fileUploadConfig?.maxFileSizeBytes === 'number'
      ? { maxSizeBytes: question.fileUploadConfig.maxFileSizeBytes }
      : {}),
    ...(question.fileUploadConfig?.allowedFileCategories &&
    question.fileUploadConfig.allowedFileCategories.length > 0
      ? { allowedCategories: question.fileUploadConfig.allowedFileCategories }
      : {}),
    createUploadIntentInput: () => ({
      visibility: 'PRIVATE',
      metadata: {
        assessmentUsage: 'ASSESSMENT_SUBMISSION',
        assessmentId,
        assessmentAttemptId: attemptId,
        assessmentQuestionId: question.id,
      },
    }),
    onAssetsChanged: (assets) => {
      const nextIds = [
        ...value,
        ...assets
          .map((asset) => asset.id)
          .filter((assetId) => !value.includes(assetId)),
      ];
      onChange(nextIds);
    },
  });

  async function openSubmittedFile(assetId: string) {
    if (!answerId) {
      return;
    }

    setDownloadError(undefined);
    try {
      const readUrl = await createAssessmentAttemptAnswerFileReadUrl(
        attemptId,
        answerId,
        assetId,
      );
      window.open(readUrl.url, '_blank', 'noopener,noreferrer');
    } catch (caught) {
      setDownloadError(
        caught instanceof Error ? caught.message : 'Unable to open the submitted file.',
      );
    }
  }

  return (
    <div className="space-y-4" data-testid="file-upload-answer">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Upload files through Media Library</p>
        <p className="mt-1">
          Accepted categories:{' '}
          {question.fileUploadConfig?.allowedFileCategories?.length
            ? question.fileUploadConfig.allowedFileCategories.join(', ')
            : 'Any'}
        </p>
        <p className="mt-1">
          Max files:{' '}
          {typeof question.fileUploadConfig?.maxFiles === 'number'
            ? question.fileUploadConfig.maxFiles
            : 'Not specified'}
        </p>
        <p className="mt-1">
          Max file size:{' '}
          {typeof question.fileUploadConfig?.maxFileSizeBytes === 'number'
            ? `${Math.round(question.fileUploadConfig.maxFileSizeBytes / (1024 * 1024))} MB`
            : 'Not specified'}
        </p>
      </div>

      {!disabled ? (
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

      <div className="space-y-2">
        {currentFiles.length === 0 ? (
          <p className="text-sm text-slate-500">No files selected yet.</p>
        ) : (
          currentFiles.map((file) => (
            <div
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
              key={file.mediaAssetId}
            >
              <div>
                <p className="font-medium text-slate-900">{file.filename}</p>
                <p className="text-slate-500">
                  {file.fileCategory} · {file.contentType}
                </p>
              </div>
              <div className="flex gap-2">
                {answerId && file.status === 'AVAILABLE' ? (
                  <button onClick={() => void openSubmittedFile(file.mediaAssetId)} type="button">
                    Open
                  </button>
                ) : null}
                {!disabled ? (
                  <button
                    onClick={() => onChange(value.filter((assetId) => assetId !== file.mediaAssetId))}
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {downloadError ? <p className="text-sm text-rose-700">{downloadError}</p> : null}

      {!disabled && upload.items.length > 0 ? (
        <p className="text-xs text-slate-500">
          Uploaded files are attached by media asset ID. Save the answer to persist the references.
        </p>
      ) : null}

      {!disabled && currentFiles.length < value.length ? (
        <p className="text-xs text-slate-500">
          {value.filter((assetId) => !currentFileIds.has(assetId)).length} uploaded file reference
          {value.length - currentFiles.length === 1 ? '' : 's'} will appear after the answer is
          saved.
        </p>
      ) : null}
    </div>
  );
}
