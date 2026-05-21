'use client';

import { useState } from 'react';
import { toManualGradeRequest, validateManualGradeInput } from '../../state';
import type {
  AssessmentManualReviewItemContract,
  ManualGradeAssessmentAnswerRequest,
} from '../../types';
import { GradeFeedbackEditor } from './grade-feedback-editor';
import { GradeScoreInput } from './grade-score-input';

interface ManualGradeFormProps {
  item: AssessmentManualReviewItemContract;
  submitting?: boolean;
  onSubmit: (answerId: string, input: ManualGradeAssessmentAnswerRequest) => Promise<void>;
}

export function ManualGradeForm({ item, submitting = false, onSubmit }: ManualGradeFormProps) {
  const [score, setScore] = useState(
    item.currentScore !== undefined ? String(item.currentScore) : '',
  );
  const [feedback, setFeedback] = useState(
    item.currentFeedback?.note ? String(item.currentFeedback.note) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const isLocked = item.status !== 'PENDING_MANUAL_REVIEW';

  async function handleSubmit() {
    if (score.trim().length === 0) {
      setError('Score is required.');
      return;
    }
    const numericScore = Number(score);
    const validation = validateManualGradeInput({
      score: numericScore,
      maxScore: item.maxScore,
      feedback,
    });
    if (!validation.valid) {
      setError(validation.message ?? 'Invalid score.');
      return;
    }
    setError(null);
    await onSubmit(item.answerId, toManualGradeRequest({ score: numericScore, feedback }));
  }

  return (
    <div
      className="space-y-3 rounded-2xl border border-portal-border bg-white p-4"
      data-testid="manual-grade-form"
    >
      <GradeScoreInput
        value={score}
        maxScore={item.maxScore}
        onChange={setScore}
        disabled={isLocked || submitting}
      />
      <GradeFeedbackEditor
        value={feedback}
        onChange={setFeedback}
        disabled={isLocked || submitting}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <button
        data-testid="manual-grade-submit-button"
        className="rounded-xl border border-portal-border px-3 py-2 text-sm"
        disabled={isLocked || submitting}
        onClick={() => void handleSubmit()}
        type="button"
      >
        {isLocked ? 'Graded' : submitting ? 'Submitting...' : 'Submit grade'}
      </button>
    </div>
  );
}
