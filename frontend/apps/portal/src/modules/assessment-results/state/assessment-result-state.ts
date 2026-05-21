import type { AssessmentAttemptGradingStatusContract } from '@/contracts/assessment-delivery';
import type { AssessmentInstructorResultContract, AssessmentLearnerResultContract } from '../types';

export function isResultReleased(result: AssessmentLearnerResultContract | AssessmentInstructorResultContract): boolean {
  return result.gradingStatus === 'RELEASED' && typeof result.releasedAt === 'string';
}

export function formatScore(input: { score?: number | undefined; maxScore?: number | undefined }): string {
  if (input.score === undefined || input.maxScore === undefined) {
    return 'Not available';
  }
  return `${input.score} / ${input.maxScore}`;
}

export function calculateScorePercent(input: { score?: number | undefined; maxScore?: number | undefined }): number | undefined {
  if (input.score === undefined || input.maxScore === undefined || input.maxScore <= 0) {
    return undefined;
  }
  return Math.round((input.score / input.maxScore) * 100);
}

export function canShowLearnerResult(input: {
  gradingStatus: AssessmentAttemptGradingStatusContract;
  releasedAt?: string | undefined;
}): boolean {
  return input.gradingStatus === 'RELEASED' && typeof input.releasedAt === 'string';
}

export function getResultStatusLabel(input: {
  gradingStatus: AssessmentAttemptGradingStatusContract;
  releasedAt?: string | undefined;
}): string {
  if (canShowLearnerResult(input)) {
    return 'Released';
  }
  if (input.gradingStatus === 'PENDING_MANUAL_REVIEW') {
    return 'Pending manual review';
  }
  if (input.gradingStatus === 'GRADED') {
    return 'Graded, not released';
  }
  if (input.gradingStatus === 'NOT_GRADED') {
    return 'Not graded';
  }
  return input.gradingStatus.replace(/_/g, ' ');
}
