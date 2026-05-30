/**
 * Assessment Builder frontend contract types.
 * These mirror backend contract-catalog Assessment Delivery contracts exactly.
 * No Prisma types, no persistence internals, no attempt runtime types.
 */
export type {
  AssessmentContract,
  AssessmentGradingModeContract,
  AssessmentPublishedSnapshotContract,
  AssessmentPurposeContract,
  AssessmentQuestionContract,
  AssessmentQuestionKindContract,
  AssessmentResultReleasePolicyContract,
  AssessmentSectionContract,
  AssessmentStatusContract,
  AssessmentVersionContract,
  AssessmentVersionStatusContract,
  AssessmentVisibilityContract,
  CreateAssessmentRequest,
  GradingRubricContract,
  GradingRuleContract,
  PublishAssessmentRequest,
  QuestionAnswerKeyContract,
  ReplaceAssessmentContentRequest,
  RestoreAssessmentRequest,
  UpdateAssessmentRequest,
  CodingAuthoringTestCase,
  CodingQuestionAuthoringConfigContract,
  CodingQuestionLearnerConfigContract,
} from '@/contracts/assessment-delivery';
