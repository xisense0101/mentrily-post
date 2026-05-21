import type {
  AssessmentGradingModeContract,
  AssessmentPurposeContract,
  AssessmentQuestionKindContract,
  AssessmentResultReleasePolicyContract,
  AssessmentVisibilityContract,
} from '@mentrily/contract-catalog';

export interface AssessmentQuestionInput {
  id: string;
  sectionId?: string | undefined;
  kind: AssessmentQuestionKindContract;
  title: string;
  prompt: Record<string, unknown>;
  options: Array<Record<string, unknown>>;
  answerKey?: Record<string, unknown> | undefined;
  points: number;
  gradingMode: AssessmentGradingModeContract;
  position: number;
  metadata?: Record<string, unknown> | undefined;
}

export interface AssessmentSectionInput {
  id: string;
  title: string;
  description?: string | undefined;
  position: number;
  metadata?: Record<string, unknown> | undefined;
  questions: AssessmentQuestionInput[];
}

export interface GradingRubricInput {
  id: string;
  title: string;
  criteria: Array<Record<string, unknown>>;
}

export interface GradingRuleInput {
  id: string;
  questionId?: string | undefined;
  mode: AssessmentGradingModeContract;
  ruleType: 'EXACT_MATCH' | 'OPTION_MATCH' | 'RUBRIC' | 'MANUAL_REVIEW' | 'CODE_OUTPUT_RESERVED';
  config: Record<string, unknown>;
}

export interface CreateAssessmentInput {
  title: string;
  purpose: AssessmentPurposeContract;
  description?: string | undefined;
  visibility?: AssessmentVisibilityContract | undefined;
  attemptPolicy?:
    | {
        maxAttempts?: number | undefined;
        allowRetake: boolean;
        shuffleQuestions: boolean;
        shuffleOptions: boolean;
      }
    | undefined;
  timeLimitMinutes?: number | undefined;
  resultReleasePolicy?: AssessmentResultReleasePolicyContract | undefined;
  metadata?: Record<string, unknown> | undefined;
  sections?: AssessmentSectionInput[] | undefined;
  looseQuestions?: AssessmentQuestionInput[] | undefined;
  gradingRubrics?: GradingRubricInput[] | undefined;
  gradingRules?: GradingRuleInput[] | undefined;
}
