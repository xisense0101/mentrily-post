import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { LearningCourseRepository } from '../../domain/repositories/learning-course.repository.js';
import { LearningCourse } from '../../domain/entities/learning-course.entity.js';
import { requireLearningWorkspace } from '../support/learning-context.js';

@Injectable()
export class ListWorkspaceLearningCoursesUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly repo: LearningCourseRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext): Promise<LearningCourse[]> {
    const workspace = requireLearningWorkspace(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_COURSE_READ, workspace },
      context,
    );
    if (!perm.allowed) throw new AppError('FORBIDDEN', 'permission denied', 403);

    const courses = await this.repo.listByWorkspace(workspace.workspaceId);
    return courses.filter(
      (course) =>
        course.tenantId === workspace.tenantId && course.workspaceId === workspace.workspaceId,
    );
  }
}
