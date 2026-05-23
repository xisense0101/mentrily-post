import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { InboxHandlerRegistry } from './inbox-handler-registry.js';
import { InboxProcessingWorker } from './inbox-processing.worker.js';
import { NoopInboxHandler } from './noop-inbox-handler.js';
import {
  NotificationHelper,
  AssessmentPublishedInboxHandler,
  AssessmentAttemptSubmittedInboxHandler,
  AssessmentGradingRunCompletedInboxHandler,
  AssessmentResultReleasedInboxHandler,
  LearningCoursePublishedInboxHandler,
  LearningEnrollmentCreatedInboxHandler,
  LearningProgressCompletedInboxHandler,
  LearningEnrollmentCompletedInboxHandler,
  ContentDocumentPublishedInboxHandler,
  ContentDocumentDraftBlocksReplacedInboxHandler,
  ContentDocumentReviewReadyInboxHandler,
  MediaProcessingSucceededInboxHandler,
  MediaProcessingFailedInboxHandler,
  MediaSecurityScanCompletedInboxHandler,
  MediaLifecycleDeletedInboxHandler,
} from './communication-handlers.js';

@Module({
  imports: [DataPlatformModule],
  providers: [
    InboxProcessingWorker,
    NoopInboxHandler,
    NotificationHelper,
    AssessmentPublishedInboxHandler,
    AssessmentAttemptSubmittedInboxHandler,
    AssessmentGradingRunCompletedInboxHandler,
    AssessmentResultReleasedInboxHandler,
    LearningCoursePublishedInboxHandler,
    LearningEnrollmentCreatedInboxHandler,
    LearningProgressCompletedInboxHandler,
    LearningEnrollmentCompletedInboxHandler,
    ContentDocumentPublishedInboxHandler,
    ContentDocumentDraftBlocksReplacedInboxHandler,
    ContentDocumentReviewReadyInboxHandler,
    MediaProcessingSucceededInboxHandler,
    MediaProcessingFailedInboxHandler,
    MediaSecurityScanCompletedInboxHandler,
    MediaLifecycleDeletedInboxHandler,
    {
      provide: InboxHandlerRegistry,
      useFactory: (
        noop: NoopInboxHandler,
        assessmentPublished: AssessmentPublishedInboxHandler,
        assessmentSubmitted: AssessmentAttemptSubmittedInboxHandler,
        assessmentGraded: AssessmentGradingRunCompletedInboxHandler,
        assessmentReleased: AssessmentResultReleasedInboxHandler,
        coursePublished: LearningCoursePublishedInboxHandler,
        enrollmentCreated: LearningEnrollmentCreatedInboxHandler,
        progressCompleted: LearningProgressCompletedInboxHandler,
        enrollmentCompleted: LearningEnrollmentCompletedInboxHandler,
        docPublished: ContentDocumentPublishedInboxHandler,
        docUpdated: ContentDocumentDraftBlocksReplacedInboxHandler,
        docReview: ContentDocumentReviewReadyInboxHandler,
        mediaSucceeded: MediaProcessingSucceededInboxHandler,
        mediaFailed: MediaProcessingFailedInboxHandler,
        mediaScan: MediaSecurityScanCompletedInboxHandler,
        mediaLifecycle: MediaLifecycleDeletedInboxHandler,
      ) => {
        const registry = new InboxHandlerRegistry([], noop);
        registry.register('assessment.published', assessmentPublished);
        registry.register('assessment.attempt.submitted', assessmentSubmitted);
        registry.register('assessment.grading.run.completed', assessmentGraded);
        registry.register('assessment.result.released', assessmentReleased);
        registry.register('learning.course.published', coursePublished);
        registry.register('learning.enrollment.created', enrollmentCreated);
        registry.register('learning.progress.completed', progressCompleted);
        registry.register('learning.enrollment.completed', enrollmentCompleted);
        registry.register('content.document.published', docPublished);
        registry.register('content.document.draft_blocks_replaced', docUpdated);
        registry.register('content.document.review_ready', docReview);
        registry.register('media.processing.succeeded', mediaSucceeded);
        registry.register('media.processing.failed', mediaFailed);
        registry.register('media.security_scan.completed', mediaScan);
        registry.register('media.lifecycle.deleted', mediaLifecycle);
        return registry;
      },
      inject: [
        NoopInboxHandler,
        AssessmentPublishedInboxHandler,
        AssessmentAttemptSubmittedInboxHandler,
        AssessmentGradingRunCompletedInboxHandler,
        AssessmentResultReleasedInboxHandler,
        LearningCoursePublishedInboxHandler,
        LearningEnrollmentCreatedInboxHandler,
        LearningProgressCompletedInboxHandler,
        LearningEnrollmentCompletedInboxHandler,
        ContentDocumentPublishedInboxHandler,
        ContentDocumentDraftBlocksReplacedInboxHandler,
        ContentDocumentReviewReadyInboxHandler,
        MediaProcessingSucceededInboxHandler,
        MediaProcessingFailedInboxHandler,
        MediaSecurityScanCompletedInboxHandler,
        MediaLifecycleDeletedInboxHandler,
      ],
    },
  ],
  exports: [InboxProcessingWorker, InboxHandlerRegistry],
})
export class InboxProcessingModule {}
