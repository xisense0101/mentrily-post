import type { ProctoringAttemptSummaryContract } from '../proctoring/index.js';

export type AssessmentPurposeContract =
  | 'QUIZ'
  | 'EXAM'
  | 'PRACTICE'
  | 'ASSIGNMENT'
  | 'PLACEMENT_TEST'
  | 'CERTIFICATION';

export type AssessmentStatusContract = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type AssessmentVersionStatusContract = 'DRAFT' | 'PUBLISHED_SNAPSHOT' | 'SUPERSEDED';

export type AssessmentVisibilityContract = 'PRIVATE' | 'WORKSPACE' | 'PUBLIC_LINK' | 'INVITE_ONLY';

export type AssessmentQuestionKindContract =
  | 'MCQ'
  | 'MULTI_SELECT'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'CODE'
  | 'NOTEBOOK'
  | 'READING_PASSAGE'
  | 'FILE_UPLOAD'
  | 'RUBRIC_ONLY';

export type AssessmentGradingModeContract = 'AUTO' | 'MANUAL' | 'HYBRID';

export type AssessmentResultReleasePolicyContract =
  | 'IMMEDIATE'
  | 'AFTER_DUE_DATE'
  | 'AFTER_MANUAL_REVIEW'
  | 'MANUAL_RELEASE';

export interface AssessmentMediaReferenceContract {
  mediaAssetId: string;
}

export interface AssessmentMediaAttachmentContract {
  mediaAssetId: string;
  filename: string;
  contentType: string;
  fileCategory: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'ARCHIVE' | 'OTHER';
  sizeBytes?: number | undefined;
  status:
    | 'PENDING_UPLOAD'
    | 'UPLOADED'
    | 'PROCESSING_QUEUED'
    | 'PROCESSING'
    | 'AVAILABLE'
    | 'PROCESSING_FAILED'
    | 'ARCHIVED'
    | 'FAILED'
    | 'ABANDONED'
    | 'DELETE_QUEUED'
    | 'DELETED';
  unavailable?: boolean | undefined;
}

export interface AssessmentFileUploadQuestionConfigContract {
  allowedFileCategories?:
    | Array<'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'ARCHIVE' | 'OTHER'>
    | undefined;
  allowedContentTypes?: string[] | undefined;
  maxFiles?: number | undefined;
  maxFileSizeBytes?: number | undefined;
}

export interface AssessmentFileUploadAnswerInputContract {
  mediaAssetIds: string[];
}

export type AssessmentSubmittedFileContract = AssessmentMediaAttachmentContract;

export interface QuestionAnswerKeyContract {
  correctOptionIds?: string[] | undefined;
  acceptedTextAnswers?: string[] | undefined;
  expectedOutput?: string | undefined;
  rubricId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface AssessmentQuestionContract {
  id: string;
  sectionId?: string | undefined;
  kind: AssessmentQuestionKindContract;
  title: string;
  prompt: Record<string, unknown>;
  options: Array<Record<string, unknown>>;
  answerKey?: QuestionAnswerKeyContract | undefined;
  points: number;
  gradingMode: AssessmentGradingModeContract;
  position: number;
  metadata?: Record<string, unknown> | undefined;
  attachments?: AssessmentMediaAttachmentContract[] | undefined;
  fileUploadConfig?: AssessmentFileUploadQuestionConfigContract | undefined;
}

export interface AssessmentSectionContract {
  id: string;
  title: string;
  description?: string | undefined;
  position: number;
  metadata?: Record<string, unknown> | undefined;
  questions: AssessmentQuestionContract[];
}

export interface GradingRubricContract {
  id: string;
  title: string;
  criteria: Array<Record<string, unknown>>;
}

export interface GradingRuleContract {
  id: string;
  questionId?: string | undefined;
  mode: AssessmentGradingModeContract;
  ruleType: 'EXACT_MATCH' | 'OPTION_MATCH' | 'RUBRIC' | 'MANUAL_REVIEW' | 'CODE_OUTPUT_RESERVED';
  config: Record<string, unknown>;
}

export interface AssessmentVersionContract {
  id: string;
  versionNumber: number;
  status: AssessmentVersionStatusContract;
  createdByPrincipalId: string;
  createdAt: string;
  publishedAt?: string | undefined;
  supersededAt?: string | undefined;
  sections: AssessmentSectionContract[];
  looseQuestions: AssessmentQuestionContract[];
}

export interface AssessmentPublishedSnapshotContract {
  id: string;
  assessmentId: string;
  versionId: string;
  versionNumber: number;
  sections: AssessmentSectionContract[];
  looseQuestions: AssessmentQuestionContract[];
  publishedByPrincipalId: string;
  publishedAt: string;
  createdAt: string;
}

export type GetAssessmentAttemptSnapshotResponse = AssessmentPublishedSnapshotContract;

export interface AssessmentContract {
  id: string;
  purpose: AssessmentPurposeContract;
  status: AssessmentStatusContract;
  visibility: AssessmentVisibilityContract;
  title: string;
  description?: string | undefined;
  ownerPrincipalId: string;
  attemptPolicy: Record<string, unknown>;
  timeLimitMinutes?: number | undefined;
  resultReleasePolicy: AssessmentResultReleasePolicyContract;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | undefined;
  archivedAt?: string | undefined;
  currentDraftVersion?: AssessmentVersionContract | undefined;
  publishedSnapshotId?: string | undefined;
  gradingRubrics: GradingRubricContract[];
  gradingRules: GradingRuleContract[];
}

export interface CreateAssessmentRequest {
  title: string;
  purpose: AssessmentPurposeContract;
  description?: string | undefined;
  visibility?: AssessmentVisibilityContract | undefined;
  attemptPolicy?: Record<string, unknown> | undefined;
  timeLimitMinutes?: number | undefined;
  resultReleasePolicy?: AssessmentResultReleasePolicyContract | undefined;
  metadata?: Record<string, unknown> | undefined;
  sections?: AssessmentSectionContract[] | undefined;
  looseQuestions?: AssessmentQuestionContract[] | undefined;
  gradingRubrics?: GradingRubricContract[] | undefined;
  gradingRules?: GradingRuleContract[] | undefined;
}

export interface UpdateAssessmentRequest {
  title?: string | undefined;
  description?: string | null | undefined;
  visibility?: AssessmentVisibilityContract | undefined;
  attemptPolicy?: Record<string, unknown> | undefined;
  timeLimitMinutes?: number | null | undefined;
  resultReleasePolicy?: AssessmentResultReleasePolicyContract | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface ReplaceAssessmentContentRequest {
  sections: AssessmentSectionContract[];
  looseQuestions: AssessmentQuestionContract[];
  gradingRubrics?: GradingRubricContract[] | undefined;
  gradingRules?: GradingRuleContract[] | undefined;
}

export type PublishAssessmentRequest = Record<string, never>;

export type RestoreAssessmentRequest = Record<string, never>;

// --- Assessment Attempt Runtime Contracts (Task 011A) ---

export type AssessmentAttemptStatusContract =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type AssessmentAttemptAnswerStatusContract = 'DRAFT' | 'SUBMITTED';

export type AssessmentAttemptGradingStatusContract =
  | 'NOT_GRADED'
  | 'AUTO_GRADING_RESERVED'
  | 'PENDING_MANUAL_REVIEW'
  | 'GRADED'
  | 'RELEASED';

export type AssessmentAnswerGradeStatusContract =
  | 'NOT_GRADED'
  | 'AUTO_GRADED'
  | 'PENDING_MANUAL_REVIEW'
  | 'MANUALLY_GRADED'
  | 'GRADING_SKIPPED'
  | 'GRADING_FAILED';

export type AssessmentGradingRunStatusContract =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED';

export type AssessmentGradingMethodContract =
  | 'AUTO_RULE'
  | 'MANUAL_REVIEW'
  | 'CODE_EXECUTION_RESERVED'
  | 'AI_RESERVED';

// --- Assessment Execution Runtime Prep (Task 011F) ---

export type AssessmentExecutionKindContract = 'CODE' | 'NOTEBOOK';

export type AssessmentExecutionStatusContract =
  | 'NOT_REQUESTED'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'CANCELLED'
  | 'PROVIDER_UNAVAILABLE'
  | 'RESERVED';

export type AssessmentExecutionProviderStatusContract = 'READY' | 'FIXTURE_ONLY' | 'UNAVAILABLE';

export type AssessmentExecutionLanguageContract =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'go'
  | 'rust';

export interface AssessmentExecutionResourceLimitsContract {
  timeoutMs: number;
  memoryMb: number;
  cpuCount?: number | undefined;
  outputLimitKb?: number | undefined;
}

export interface AssessmentExecutionRequestContract {
  id: string;
  tenantId: string;
  workspaceId: string;
  attemptId: string;
  answerId: string;
  questionId: string;
  kind: AssessmentExecutionKindContract;
  language?: AssessmentExecutionLanguageContract | undefined;
  source?: string | undefined;
  notebookJson?: Record<string, unknown> | undefined;
  resourceLimits: AssessmentExecutionResourceLimitsContract;
  status: AssessmentExecutionStatusContract;
  requestedByPrincipalId: string;
  requestedAt: string;
  metadata: Record<string, unknown>;
}

export interface AssessmentExecutionResultContract {
  id: string;
  executionRequestId: string;
  status: AssessmentExecutionStatusContract;
  stdout?: string | undefined;
  stderr?: string | undefined;
  exitCode?: number | undefined;
  durationMs?: number | undefined;
  memoryMb?: number | undefined;
  provider?: string | undefined;
  error?: string | undefined;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RequestAssessmentExecutionRequest {
  answerId: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface CancelAssessmentExecutionRequest {
  executionRequestId: string;
}

export interface AssessmentExecutionRequestResponse {
  executionRequestId: string;
  attemptId: string;
  answerId: string;
  questionId: string;
  kind: AssessmentExecutionKindContract;
  language?: AssessmentExecutionLanguageContract | undefined;
  status: AssessmentExecutionStatusContract;
  requestedAt: string;
}

export interface RequestAssessmentExecutionResponse {
  request: AssessmentExecutionRequestResponse;
  result: AssessmentExecutionResultContract;
}

export interface AssessmentAttemptSessionContract {
  id: string;
  startedAt: string;
  lastSeenAt: string;
  expiresAt?: string | undefined;
  submittedAt?: string | undefined;
}

export interface AssessmentAttemptAnswerContract {
  id: string;
  questionId: string;
  questionKind: AssessmentQuestionKindContract;
  answer: Record<string, unknown>;
  status: AssessmentAttemptAnswerStatusContract;
  savedAt: string;
  submittedAt?: string | undefined;
  metadata: Record<string, unknown>;
  submittedFiles?: AssessmentSubmittedFileContract[] | undefined;
}

export interface AssessmentAttemptResultContract {
  id: string;
  gradingStatus: AssessmentAttemptGradingStatusContract;
  score?: number | undefined;
  maxScore?: number | undefined;
  releasedAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export type AssessmentAttemptConflictReasonContract =
  | 'ATTEMPT_EXPIRED'
  | 'ATTEMPT_NOT_EDITABLE'
  | 'ATTEMPT_NOT_SUBMITTABLE';

export interface AssessmentAttemptConflictContract {
  reason: AssessmentAttemptConflictReasonContract;
  attemptId: string;
  attemptStatus: AssessmentAttemptStatusContract;
  expiresAt?: string | undefined;
  serverNow: string;
}

export interface AssessmentAttemptContract {
  id: string;
  assessmentId: string;
  snapshotId: string;
  snapshotVersionNumber: number;
  learnerPrincipalId: string;
  status: AssessmentAttemptStatusContract;
  serverNow?: string | undefined;
  canEdit?: boolean | undefined;
  canSubmit?: boolean | undefined;
  proctoring?: ProctoringAttemptSummaryContract | undefined;
  session: AssessmentAttemptSessionContract;
  answers: AssessmentAttemptAnswerContract[];
  result?: AssessmentAttemptResultContract | undefined;
  startedAt: string;
  submittedAt?: string | undefined;
  expiresAt?: string | undefined;
  cancelledAt?: string | undefined;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StartAssessmentAttemptRequest {
  metadata?: Record<string, unknown> | undefined;
}

export interface AssessmentAnswerGradeContract {
  id: string;
  attemptId: string;
  answerId: string;
  questionId: string;
  questionKind: AssessmentQuestionKindContract;
  status: AssessmentAnswerGradeStatusContract;
  method: AssessmentGradingMethodContract;
  score?: number | undefined;
  maxScore: number;
  feedback?: Record<string, unknown> | undefined;
  gradedByPrincipalId?: string | undefined;
  gradedAt?: string | undefined;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentGradingRunContract {
  id: string;
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  status: AssessmentGradingRunStatusContract;
  totalScore?: number | undefined;
  maxScore?: number | undefined;
  answerGrades: AssessmentAnswerGradeContract[];
  hasPendingManualReview: boolean;
  startedAt: string;
  completedAt?: string | undefined;
  failedAt?: string | undefined;
  error?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentManualReviewItemContract {
  gradingRunId: string;
  answerGradeId: string;
  attemptId: string;
  answerId: string;
  assessmentId: string;
  snapshotId: string;
  questionId: string;
  questionKind: AssessmentQuestionKindContract;
  questionTitle?: string | undefined;
  questionPrompt?: Record<string, unknown> | undefined;
  maxScore: number;
  currentScore?: number | undefined;
  currentFeedback?: Record<string, unknown> | undefined;
  learnerAnswer: Record<string, unknown>;
  submittedFiles?: AssessmentSubmittedFileContract[] | undefined;
  learnerPrincipalId: string;
  assessmentTitle?: string | undefined;
  submittedAt?: string | undefined;
  status: AssessmentAnswerGradeStatusContract;
  method: AssessmentGradingMethodContract;
}

export interface AssessmentManualReviewQueueResponse {
  items: AssessmentManualReviewItemContract[];
}

export type GradeAssessmentAttemptRequest = Record<string, never>;

export interface ManualGradeAssessmentAnswerRequest {
  score: number;
  feedback?: Record<string, unknown> | undefined;
}

export interface SaveAssessmentAttemptAnswerRequest {
  questionId: string;
  questionKind: AssessmentQuestionKindContract;
  answer: Record<string, unknown>;
  metadata?: Record<string, unknown> | undefined;
}

export type SubmitAssessmentAttemptRequest = Record<string, never>;

export type CancelAssessmentAttemptRequest = Record<string, never>;

export interface AssessmentResultSummaryContract {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  learnerPrincipalId: string;
  status: AssessmentAttemptStatusContract;
  gradingStatus: AssessmentAttemptGradingStatusContract;
  score?: number | undefined;
  maxScore?: number | undefined;
  releasedAt?: string | undefined;
  submittedAt?: string | undefined;
}

// --- Coding Result Summary (Task 015E) ---

export type CodingVerdictContract =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'OUTPUT_LIMIT_EXCEEDED'
  | 'PROVIDER_UNAVAILABLE'
  | 'VALIDATION_ERROR';

export type CodingGradeStatusContract =
  | 'AUTO_GRADED'
  | 'PENDING_MANUAL_REVIEW'
  | 'MANUALLY_GRADED'
  | 'GRADING_FAILED';

export interface CodingPublicTestResultContract {
  /** 1-based display index; internal hidden test IDs are never exposed */
  index: number;
  verdict: CodingVerdictContract;
  passed: boolean;
  stdout?: string | undefined;
  stderr?: string | undefined;
}

export interface CodingResultSummaryContract {
  scoreAwarded: number;
  maxScore: number;
  status: CodingGradeStatusContract;
  verdict?: CodingVerdictContract | undefined;
  /** Safe public test results only — no hidden test details */
  publicTestResults?: CodingPublicTestResultContract[] | undefined;
  passedHiddenCount?: number | undefined;
  totalHiddenCount?: number | undefined;
  /** Safe user-facing message only */
  message?: string | undefined;
}

export interface AssessmentAnswerResultContract {
  questionId: string;
  questionKind: AssessmentQuestionKindContract;
  score?: number | undefined;
  maxScore?: number | undefined;
  /** Raw feedback field — do not render generically; use codingResult for CODE questions */
  feedback?: Record<string, unknown> | undefined;
  answerStatus: AssessmentAttemptAnswerStatusContract;
  /** Safe coding result summary present only for CODE questions */
  codingResult?: CodingResultSummaryContract | undefined;
}

export interface AssessmentLearnerResultContract extends AssessmentResultSummaryContract {
  answers: AssessmentAnswerResultContract[];
}

export interface AssessmentInstructorAnswerResultContract extends AssessmentAnswerResultContract {
  answerId: string;
  answerGradeId?: string | undefined;
  learnerAnswer: Record<string, unknown>;
  gradingMethod?: AssessmentGradingMethodContract | undefined;
  gradedAt?: string | undefined;
  gradedByPrincipalId?: string | undefined;
}

export interface AssessmentInstructorResultContract extends AssessmentResultSummaryContract {
  gradingRunId?: string | undefined;
  answers: AssessmentInstructorAnswerResultContract[];
  feedback?: Record<string, unknown> | undefined;
}

export type ReleaseAssessmentResultRequest = Record<string, never>;
export type ReleaseAssessmentResultResponse = AssessmentInstructorResultContract;
