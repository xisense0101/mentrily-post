import type {
  CodingVerdictContract,
  CodingGradeStatusContract,
} from '@/contracts/assessment-delivery';

/** User-friendly label for a coding verdict. */
export function getCodingVerdictLabel(verdict: CodingVerdictContract | undefined): string {
  if (!verdict) return 'No verdict';
  switch (verdict) {
    case 'ACCEPTED':
      return 'Accepted';
    case 'WRONG_ANSWER':
      return 'Wrong answer';
    case 'COMPILE_ERROR':
      return 'Compile error';
    case 'RUNTIME_ERROR':
      return 'Runtime error';
    case 'TIME_LIMIT_EXCEEDED':
      return 'Time limit exceeded';
    case 'MEMORY_LIMIT_EXCEEDED':
      return 'Memory limit exceeded';
    case 'OUTPUT_LIMIT_EXCEEDED':
      return 'Output limit exceeded';
    case 'PROVIDER_UNAVAILABLE':
      return 'Execution provider unavailable';
    case 'VALIDATION_ERROR':
      return 'Validation error';
    default:
      return 'Unknown';
  }
}

/** User-friendly label for a coding grade status. */
export function getCodingGradeStatusLabel(status: CodingGradeStatusContract): string {
  switch (status) {
    case 'AUTO_GRADED':
      return 'Auto graded';
    case 'PENDING_MANUAL_REVIEW':
      return 'Pending manual review';
    case 'MANUALLY_GRADED':
      return 'Manually graded';
    case 'GRADING_FAILED':
      return 'Grading failed';
    default:
      return 'Unknown';
  }
}

/** Whether the verdict represents a successful execution. */
export function isAcceptedVerdict(verdict: CodingVerdictContract | undefined): boolean {
  return verdict === 'ACCEPTED';
}

/** Whether the grading status indicates the answer needs manual review. */
export function isPendingManualReview(status: CodingGradeStatusContract): boolean {
  return status === 'PENDING_MANUAL_REVIEW';
}

/** Whether the grading status indicates grading failed. */
export function isGradingFailed(status: CodingGradeStatusContract): boolean {
  return status === 'GRADING_FAILED';
}
