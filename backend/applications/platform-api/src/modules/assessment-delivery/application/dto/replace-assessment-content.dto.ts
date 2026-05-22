import type {
  AssessmentFileUploadQuestionConfigContract,
  AssessmentGradingModeContract,
  AssessmentMediaReferenceContract,
  AssessmentQuestionKindContract,
} from '@mentrily/contract-catalog';

export interface ReplaceAssessmentQuestionInput {
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
  attachments?: AssessmentMediaReferenceContract[] | undefined;
  fileUploadConfig?: AssessmentFileUploadQuestionConfigContract | undefined;
}

export interface ReplaceAssessmentSectionInput {
  id: string;
  title: string;
  description?: string | undefined;
  position: number;
  metadata?: Record<string, unknown> | undefined;
  questions: ReplaceAssessmentQuestionInput[];
}

export interface ReplaceAssessmentRubricInput {
  id: string;
  title: string;
  criteria: Array<Record<string, unknown>>;
}

export interface ReplaceAssessmentRuleInput {
  id: string;
  questionId?: string | undefined;
  mode: AssessmentGradingModeContract;
  ruleType: 'EXACT_MATCH' | 'OPTION_MATCH' | 'RUBRIC' | 'MANUAL_REVIEW' | 'CODE_OUTPUT_RESERVED';
  config: Record<string, unknown>;
}

export interface ReplaceAssessmentContentInput {
  sections: ReplaceAssessmentSectionInput[];
  looseQuestions: ReplaceAssessmentQuestionInput[];
  gradingRubrics?: ReplaceAssessmentRubricInput[] | undefined;
  gradingRules?: ReplaceAssessmentRuleInput[] | undefined;
}
