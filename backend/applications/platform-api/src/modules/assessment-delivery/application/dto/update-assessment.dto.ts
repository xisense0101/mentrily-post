import type {
  AssessmentResultReleasePolicyContract,
  AssessmentVisibilityContract,
} from '@mentrily/contract-catalog';

export interface UpdateAssessmentInput {
  title?: string | undefined;
  description?: string | null | undefined;
  visibility?: AssessmentVisibilityContract | undefined;
  attemptPolicy?:
    | {
        maxAttempts?: number | undefined;
        allowRetake: boolean;
        shuffleQuestions: boolean;
        shuffleOptions: boolean;
      }
    | undefined;
  timeLimitMinutes?: number | null | undefined;
  resultReleasePolicy?: AssessmentResultReleasePolicyContract | undefined;
  metadata?: Record<string, unknown> | undefined;
}
