import type { AssessmentQuestionKindContract } from '@mentrily/contract-catalog';

export interface SaveAssessmentAttemptAnswerInput {
  questionId: string;
  questionKind: AssessmentQuestionKindContract;
  answer: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
