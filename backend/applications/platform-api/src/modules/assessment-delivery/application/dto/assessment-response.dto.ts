import type {
  AssessmentGradingModeContract,
  AssessmentPurposeContract,
  AssessmentQuestionKindContract,
  AssessmentResultReleasePolicyContract,
  AssessmentStatusContract,
  AssessmentVersionStatusContract,
  AssessmentVisibilityContract,
} from '@mentrily/contract-catalog';

export interface AssessmentQuestionResponse {
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
  metadata: Record<string, unknown>;
}

export interface AssessmentSectionResponse {
  id: string;
  title: string;
  description?: string | undefined;
  position: number;
  metadata: Record<string, unknown>;
  questions: AssessmentQuestionResponse[];
}

export interface GradingRubricResponse {
  id: string;
  title: string;
  criteria: Array<Record<string, unknown>>;
}

export interface GradingRuleResponse {
  id: string;
  questionId?: string | undefined;
  mode: AssessmentGradingModeContract;
  ruleType: 'EXACT_MATCH' | 'OPTION_MATCH' | 'RUBRIC' | 'MANUAL_REVIEW' | 'CODE_OUTPUT_RESERVED';
  config: Record<string, unknown>;
}

export interface AssessmentVersionResponse {
  id: string;
  versionNumber: number;
  status: AssessmentVersionStatusContract;
  createdByPrincipalId: string;
  createdAt: string;
  publishedAt?: string | undefined;
  supersededAt?: string | undefined;
  sections: AssessmentSectionResponse[];
  looseQuestions: AssessmentQuestionResponse[];
}

export interface AssessmentResponse {
  id: string;
  purpose: AssessmentPurposeContract;
  status: AssessmentStatusContract;
  visibility: AssessmentVisibilityContract;
  title: string;
  description?: string | undefined;
  ownerPrincipalId: string;
  attemptPolicy: {
    maxAttempts?: number | undefined;
    allowRetake: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
  timeLimitMinutes?: number | undefined;
  resultReleasePolicy: AssessmentResultReleasePolicyContract;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | undefined;
  archivedAt?: string | undefined;
  currentDraftVersion?: AssessmentVersionResponse | undefined;
  publishedSnapshotId?: string | undefined;
  gradingRubrics: GradingRubricResponse[];
  gradingRules: GradingRuleResponse[];
}
