import { Module } from '@nestjs/common';
import {
  AuditRecordRepository,
  DataPlatformModule,
  OutboxRepository,
} from '@mentrily/data-platform';
import {
  AUDIT_RECORDER,
  OUTBOX_PUBLISHER,
  type AuditRecorder,
  type OutboxEvent,
  type OutboxPublisher,
  type RequestContext,
  type TransactionContext,
} from '@mentrily/service-core';
import { FoundationModule } from '../../foundation/foundation.module.js';
import { AssessmentDeliveryModule } from '../assessment-delivery/assessment-delivery.module.js';
import { MediaLibraryModule } from '../media-library/media-library.module.js';
import { PrismaLearningCourseRepository } from './infrastructure/persistence/prisma/prisma-learning-course.repository.js';
import { PrismaEnrollmentRepository } from './infrastructure/persistence/prisma/prisma-enrollment.repository.js';
import { PrismaLearningProgressRepository } from './infrastructure/persistence/prisma/prisma-learning-progress.repository.js';
import { PrismaLearningAssessmentLinkRepository } from './infrastructure/persistence/prisma/prisma-learning-assessment-link.repository.js';
import { LearningCourseRepository } from './domain/repositories/learning-course.repository.js';
import { EnrollmentRepository } from './domain/repositories/enrollment.repository.js';
import { LearningProgressRepository } from './domain/repositories/learning-progress.repository.js';
import { LearningAssessmentLinkRepository } from './domain/repositories/learning-assessment-link.repository.js';
import { LearningEventPublisherService } from './application/services/learning-event-publisher.service.js';
import { LearningAssessmentLinkPolicyService } from './application/services/learning-assessment-link-policy.service.js';
import { CreateLearningCourseUseCase } from './application/use-cases/create-learning-course.use-case.js';
import { GetLearningCourseUseCase } from './application/use-cases/get-learning-course.use-case.js';
import { ListWorkspaceLearningCoursesUseCase } from './application/use-cases/list-workspace-learning-courses.use-case.js';
import { UpdateLearningCourseUseCase } from './application/use-cases/update-learning-course.use-case.js';
import { AddLearningSectionUseCase } from './application/use-cases/add-learning-section.use-case.js';
import { AddLearningLessonUseCase } from './application/use-cases/add-learning-lesson.use-case.js';
import { ReorderLearningSectionsUseCase } from './application/use-cases/reorder-learning-sections.use-case.js';
import { ReorderLearningLessonsUseCase } from './application/use-cases/reorder-learning-lessons.use-case.js';
import { PublishLearningCourseUseCase } from './application/use-cases/publish-learning-course.use-case.js';
import { ArchiveLearningCourseUseCase } from './application/use-cases/archive-learning-course.use-case.js';
import { EnrollInLearningCourseUseCase } from './application/use-cases/enroll-in-learning-course.use-case.js';
import { ListLearningEnrollmentsUseCase } from './application/use-cases/list-learning-enrollments.use-case.js';
import { MarkLearningProgressUseCase } from './application/use-cases/mark-learning-progress.use-case.js';
import { CompleteEnrollmentUseCase } from './application/use-cases/complete-enrollment.use-case.js';
import { CreateLearningAssessmentLinkUseCase } from './application/use-cases/create-learning-assessment-link.use-case.js';
import { UpdateLearningAssessmentLinkUseCase } from './application/use-cases/update-learning-assessment-link.use-case.js';
import { RemoveLearningAssessmentLinkUseCase } from './application/use-cases/remove-learning-assessment-link.use-case.js';
import { ListLearningAssessmentLinksUseCase } from './application/use-cases/list-learning-assessment-links.use-case.js';
import { GetLearnerCourseDeliveryUseCase } from './application/use-cases/get-learner-course-delivery.use-case.js';
import { GetCourseAssessmentProgressUseCase } from './application/use-cases/get-course-assessment-progress.use-case.js';
import { CreatorLearningController } from './presentation/http/creator-learning.controller.js';
import { LearnerLearningController } from './presentation/http/learner-learning.controller.js';

@Module({
  imports: [DataPlatformModule, FoundationModule, MediaLibraryModule, AssessmentDeliveryModule],
  providers: [
    { provide: LearningCourseRepository, useClass: PrismaLearningCourseRepository },
    { provide: EnrollmentRepository, useClass: PrismaEnrollmentRepository },
    { provide: LearningProgressRepository, useClass: PrismaLearningProgressRepository },
    { provide: LearningAssessmentLinkRepository, useClass: PrismaLearningAssessmentLinkRepository },
    {
      provide: AUDIT_RECORDER,
      useFactory: (repository: AuditRecordRepository): AuditRecorder => ({
        async record(input, context, transaction) {
          await repository.append(input, context, transaction);
        },
      }),
      inject: [AuditRecordRepository],
    },
    {
      provide: OUTBOX_PUBLISHER,
      useFactory: (repository: OutboxRepository): OutboxPublisher => ({
        async publish<TPayload>(
          event: OutboxEvent<TPayload>,
          context: RequestContext,
          transaction?: TransactionContext,
        ): Promise<void> {
          await repository.append(event, context, transaction);
        },
      }),
      inject: [OutboxRepository],
    },
    LearningEventPublisherService,
    LearningAssessmentLinkPolicyService,
    CreateLearningCourseUseCase,
    GetLearningCourseUseCase,
    ListWorkspaceLearningCoursesUseCase,
    UpdateLearningCourseUseCase,
    AddLearningSectionUseCase,
    AddLearningLessonUseCase,
    ReorderLearningSectionsUseCase,
    ReorderLearningLessonsUseCase,
    PublishLearningCourseUseCase,
    ArchiveLearningCourseUseCase,
    EnrollInLearningCourseUseCase,
    ListLearningEnrollmentsUseCase,
    MarkLearningProgressUseCase,
    CompleteEnrollmentUseCase,
    CreateLearningAssessmentLinkUseCase,
    UpdateLearningAssessmentLinkUseCase,
    RemoveLearningAssessmentLinkUseCase,
    ListLearningAssessmentLinksUseCase,
    GetLearnerCourseDeliveryUseCase,
    GetCourseAssessmentProgressUseCase,
  ],
  controllers: [CreatorLearningController, LearnerLearningController],
  exports: [
    LearningCourseRepository,
    EnrollmentRepository,
    LearningProgressRepository,
    LearningAssessmentLinkRepository,
  ],
})
export class LearningDeliveryModule {}
