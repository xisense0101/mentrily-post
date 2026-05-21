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
import { PrismaLearningCourseRepository } from './infrastructure/persistence/prisma/prisma-learning-course.repository.js';
import { PrismaEnrollmentRepository } from './infrastructure/persistence/prisma/prisma-enrollment.repository.js';
import { PrismaLearningProgressRepository } from './infrastructure/persistence/prisma/prisma-learning-progress.repository.js';
import { LearningCourseRepository } from './domain/repositories/learning-course.repository.js';
import { EnrollmentRepository } from './domain/repositories/enrollment.repository.js';
import { LearningProgressRepository } from './domain/repositories/learning-progress.repository.js';
import { LearningEventPublisherService } from './application/services/learning-event-publisher.service.js';
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
import { CreatorLearningController } from './presentation/http/creator-learning.controller.js';
import { LearnerLearningController } from './presentation/http/learner-learning.controller.js';

@Module({
  imports: [DataPlatformModule, FoundationModule],
  providers: [
    { provide: LearningCourseRepository, useClass: PrismaLearningCourseRepository },
    { provide: EnrollmentRepository, useClass: PrismaEnrollmentRepository },
    { provide: LearningProgressRepository, useClass: PrismaLearningProgressRepository },
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
  ],
  controllers: [CreatorLearningController, LearnerLearningController],
  exports: [LearningCourseRepository, EnrollmentRepository, LearningProgressRepository],
})
export class LearningDeliveryModule {}
