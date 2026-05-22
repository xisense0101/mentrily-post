import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { FoundationModule } from '../../foundation/foundation.module.js';
import { MediaLibraryModule } from '../media-library/media-library.module.js';
import {
  AssessmentPublishPolicyService,
  AssessmentVersioningPolicyService,
  GradingPolicyService,
  AssessmentAutoGradingService,
  AssessmentGradingPolicyService,
  QuestionValidationPolicyService,
  // Attempt Runtime
  AssessmentAttemptPolicyService,
  AssessmentAttemptSubmissionPolicyService,
  AssessmentResultReleasePolicyService,
} from './domain/index.js';
import {
  AssessmentRepository,
  AssessmentSnapshotRepository,
  AssessmentAttemptRepository,
  AssessmentGradingRepository,
} from './domain/repositories/index.js';
import {
  PrismaAssessmentRepository,
  PrismaAssessmentSnapshotRepository,
  PrismaAssessmentAttemptRepository,
  PrismaAssessmentGradingRepository,
  NoopAssessmentExecutionProvider,
} from './infrastructure/index.js';
import {
  ASSESSMENT_EXECUTION_PROVIDER,
  AssessmentEventPublisherService,
  AssessmentExecutionReservationService,
  ArchiveAssessmentUseCase,
  CancelAssessmentCodeExecutionUseCase,
  CreateAssessmentUseCase,
  GetAssessmentCodeExecutionResultUseCase,
  GetAssessmentUseCase,
  GetLatestAssessmentSnapshotUseCase,
  ListAssessmentsUseCase,
  PublishAssessmentUseCase,
  RequestAssessmentCodeExecutionUseCase,
  ReplaceAssessmentContentUseCase,
  RestoreAssessmentUseCase,
  UpdateAssessmentUseCase,
  // Attempt Runtime Use Cases
  StartAssessmentAttemptUseCase,
  GetAssessmentAttemptUseCase,
  GetAssessmentAttemptSnapshotUseCase,
  ListLearnerAssessmentAttemptsUseCase,
  SaveAssessmentAttemptAnswerUseCase,
  CreateAssessmentAttemptAnswerReadUrlUseCase,
  SubmitAssessmentAttemptUseCase,
  CancelAssessmentAttemptUseCase,
  GradeAssessmentAttemptUseCase,
  GetAssessmentGradingRunUseCase,
  GetLatestAssessmentGradingRunUseCase,
  ListPendingManualReviewUseCase,
  ManualGradeAssessmentAnswerUseCase,
  ReleaseAssessmentResultUseCase,
  GetLearnerAssessmentResultUseCase,
  GetInstructorAssessmentResultUseCase,
} from './application/index.js';
import {
  AssessmentDeliveryController,
  AssessmentAttemptController,
  AssessmentGradingController,
} from './presentation/index.js';

@Module({
  imports: [FoundationModule, DataPlatformModule, MediaLibraryModule],
  controllers: [
    AssessmentDeliveryController,
    AssessmentAttemptController,
    AssessmentGradingController,
  ],
  providers: [
    // Domain Services
    QuestionValidationPolicyService,
    AssessmentPublishPolicyService,
    AssessmentVersioningPolicyService,
    GradingPolicyService,
    // Attempt Domain Services
    AssessmentAttemptPolicyService,
    AssessmentAttemptSubmissionPolicyService,
    AssessmentResultReleasePolicyService,
    AssessmentAutoGradingService,
    AssessmentGradingPolicyService,

    // Infrastructure / Repositories
    {
      provide: AssessmentRepository,
      useClass: PrismaAssessmentRepository,
    },
    {
      provide: AssessmentSnapshotRepository,
      useClass: PrismaAssessmentSnapshotRepository,
    },
    {
      provide: AssessmentAttemptRepository,
      useClass: PrismaAssessmentAttemptRepository,
    },
    {
      provide: AssessmentGradingRepository,
      useClass: PrismaAssessmentGradingRepository,
    },
    {
      provide: ASSESSMENT_EXECUTION_PROVIDER,
      useClass: NoopAssessmentExecutionProvider,
    },

    // Application Services
    AssessmentEventPublisherService,
    AssessmentExecutionReservationService,

    // Assessment Builder Use Cases
    ArchiveAssessmentUseCase,
    CreateAssessmentUseCase,
    GetAssessmentUseCase,
    GetLatestAssessmentSnapshotUseCase,
    ListAssessmentsUseCase,
    PublishAssessmentUseCase,
    ReplaceAssessmentContentUseCase,
    RestoreAssessmentUseCase,
    UpdateAssessmentUseCase,

    // Attempt Runtime Use Cases
    StartAssessmentAttemptUseCase,
    GetAssessmentAttemptUseCase,
    GetAssessmentAttemptSnapshotUseCase,
    ListLearnerAssessmentAttemptsUseCase,
    SaveAssessmentAttemptAnswerUseCase,
    CreateAssessmentAttemptAnswerReadUrlUseCase,
    SubmitAssessmentAttemptUseCase,
    CancelAssessmentAttemptUseCase,
    GradeAssessmentAttemptUseCase,
    GetAssessmentGradingRunUseCase,
    GetLatestAssessmentGradingRunUseCase,
    ListPendingManualReviewUseCase,
    ManualGradeAssessmentAnswerUseCase,
    ReleaseAssessmentResultUseCase,
    GetLearnerAssessmentResultUseCase,
    GetInstructorAssessmentResultUseCase,
    RequestAssessmentCodeExecutionUseCase,
    GetAssessmentCodeExecutionResultUseCase,
    CancelAssessmentCodeExecutionUseCase,
  ],
  exports: [
    AssessmentRepository,
    AssessmentSnapshotRepository,
    AssessmentAttemptRepository,
    CreateAssessmentUseCase,
    GetAssessmentUseCase,
    ListAssessmentsUseCase,
  ],
})
export class AssessmentDeliveryModule {}
