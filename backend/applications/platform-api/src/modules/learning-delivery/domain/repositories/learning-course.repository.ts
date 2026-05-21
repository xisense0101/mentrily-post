import { Injectable } from '@nestjs/common';
import { LearningCourse } from '../entities/learning-course.entity.js';
import { TransactionContext } from '@mentrily/service-core';

@Injectable()
export abstract class LearningCourseRepository {
  abstract save(course: LearningCourse, transaction?: TransactionContext): Promise<LearningCourse>;
  abstract findById(id: string, transaction?: TransactionContext): Promise<LearningCourse | null>;
  abstract findByWorkspaceAndSlug(
    workspaceId: string,
    slug: string,
    transaction?: TransactionContext,
  ): Promise<LearningCourse | null>;
  abstract listByWorkspace(
    workspaceId: string,
    transaction?: TransactionContext,
  ): Promise<LearningCourse[]>;
}
