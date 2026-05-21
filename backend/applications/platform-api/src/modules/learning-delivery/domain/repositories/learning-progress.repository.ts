import { Injectable } from '@nestjs/common';
import { LearningProgress } from '../entities/learning-progress.entity.js';
import { TransactionContext } from '@mentrily/service-core';

@Injectable()
export abstract class LearningProgressRepository {
  abstract save(
    progress: LearningProgress,
    transaction?: TransactionContext,
  ): Promise<LearningProgress>;
  abstract findByEnrollmentAndLesson(
    enrollmentId: string,
    lessonId: string,
    transaction?: TransactionContext,
  ): Promise<LearningProgress | null>;
  abstract listByEnrollment(
    enrollmentId: string,
    transaction?: TransactionContext,
  ): Promise<LearningProgress[]>;
  abstract listCompletedByEnrollment(
    enrollmentId: string,
    transaction?: TransactionContext,
  ): Promise<LearningProgress[]>;
}
