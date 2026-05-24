import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@mentrily/service-core';
import { LearningAssessmentLink } from '../entities/learning-assessment-link.entity.js';

@Injectable()
export abstract class LearningAssessmentLinkRepository {
  abstract save(
    link: LearningAssessmentLink,
    transaction?: TransactionContext,
  ): Promise<LearningAssessmentLink>;

  abstract findById(
    id: string,
    transaction?: TransactionContext,
  ): Promise<LearningAssessmentLink | null>;

  abstract findByCourseAndAssessment(
    input: {
      courseId: string;
      assessmentId: string;
      lessonId?: string | undefined;
    },
    transaction?: TransactionContext,
  ): Promise<LearningAssessmentLink | null>;

  abstract listByCourse(
    courseId: string,
    transaction?: TransactionContext,
  ): Promise<LearningAssessmentLink[]>;

  abstract listByLesson(
    lessonId: string,
    transaction?: TransactionContext,
  ): Promise<LearningAssessmentLink[]>;

  abstract delete(id: string, transaction?: TransactionContext): Promise<void>;
}
