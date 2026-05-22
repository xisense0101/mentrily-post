"use client";

import { useState } from 'react';
import { createAssessmentAttemptAnswerFileReadUrl } from '@/modules/assessment-attempts';
import { formatLearnerAnswer } from '../../state';
import type { AssessmentManualReviewItemContract } from '../../types';

export function AnswerReviewPanel({ item }: { item: AssessmentManualReviewItemContract }) {
  const [error, setError] = useState<string | undefined>(undefined);

  async function openSubmittedFile(assetId: string) {
    setError(undefined);
    try {
      const readUrl = await createAssessmentAttemptAnswerFileReadUrl(
        item.attemptId,
        item.answerId,
        assetId,
      );
      window.open(readUrl.url, '_blank', 'noopener,noreferrer');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to open the submitted file.');
    }
  }

  return (
    <div
      className="rounded-2xl border border-portal-border bg-white/70 p-4"
      data-testid="answer-review-panel"
    >
      <p className="text-sm font-semibold">Learner answer</p>
      {item.questionKind === 'FILE_UPLOAD' && item.submittedFiles?.length ? (
        <div className="mt-3 space-y-2" data-testid="submitted-file-review-list">
          {item.submittedFiles.map((file) => (
            <div
              className="flex items-center justify-between rounded-xl border border-portal-border bg-white px-3 py-3 text-sm"
              key={file.mediaAssetId}
            >
              <div>
                <p className="font-medium">{file.filename}</p>
                <p className="text-portal-text-muted">
                  {file.fileCategory} · {file.contentType}
                </p>
              </div>
              <button onClick={() => void openSubmittedFile(file.mediaAssetId)} type="button">
                Open
              </button>
            </div>
          ))}
        </div>
      ) : (
        <pre className="mt-2 whitespace-pre-wrap text-sm" data-testid="learner-answer-panel">
          {formatLearnerAnswer({ questionKind: item.questionKind, answer: item.learnerAnswer })}
        </pre>
      )}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
