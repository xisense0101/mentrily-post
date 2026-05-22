import type {
  AssessmentGradingRunContract,
  AssessmentManualReviewItemContract,
  AssessmentQuestionKindContract,
  ManualGradeAssessmentAnswerRequest,
} from '../types';

export function isManualReviewItemPending(item: AssessmentManualReviewItemContract): boolean {
  return item.status === 'PENDING_MANUAL_REVIEW';
}

export function isGradingRunComplete(run: AssessmentGradingRunContract): boolean {
  return run.status === 'COMPLETED';
}

export function isGradingRunPartial(run: AssessmentGradingRunContract): boolean {
  return run.status === 'PARTIAL';
}

export function calculateManualReviewProgress(input: { items: AssessmentManualReviewItemContract[] }): { total: number; pending: number; completed: number } {
  const total = input.items.length;
  const pending = input.items.filter(isManualReviewItemPending).length;
  return { total, pending, completed: total - pending };
}

export function formatLearnerAnswer(input: { questionKind: AssessmentQuestionKindContract; answer: Record<string, unknown> }): string {
  const { questionKind, answer } = input;
  if (questionKind === 'MCQ') return String(answer.selectedOptionId ?? 'No answer');
  if (questionKind === 'MULTI_SELECT') return JSON.stringify(answer.selectedOptionIds ?? []);
  if (questionKind === 'TRUE_FALSE') return String(answer.value ?? 'No answer');
  if (questionKind === 'SHORT_ANSWER' || questionKind === 'LONG_ANSWER') return String(answer.text ?? '');
  if (questionKind === 'CODE') return String(answer.sourceCode ?? answer.code ?? 'Code answer provided');
  if (questionKind === 'FILE_UPLOAD') {
    const mediaAssetIds = Array.isArray(answer.mediaAssetIds) ? answer.mediaAssetIds : [];
    return mediaAssetIds.length > 0 ? JSON.stringify(mediaAssetIds) : 'No submitted files';
  }
  return JSON.stringify(answer);
}

export function validateManualGradeInput(input: { score: number; maxScore: number; feedback?: string }): { valid: boolean; message?: string } {
  if (!Number.isFinite(input.score)) {
    return { valid: false, message: 'Score must be a finite number.' };
  }
  if (input.score < 0) {
    return { valid: false, message: 'Score cannot be negative.' };
  }
  if (input.score > input.maxScore) {
    return { valid: false, message: 'Score cannot be greater than max score.' };
  }
  return { valid: true };
}

export function toManualGradeRequest(input: { score: number; feedback?: string }): ManualGradeAssessmentAnswerRequest {
  return {
    score: input.score,
    ...(input.feedback && input.feedback.trim().length > 0
      ? { feedback: { note: input.feedback.trim() } }
      : {}),
  };
}
