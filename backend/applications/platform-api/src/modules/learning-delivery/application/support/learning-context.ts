import { AppError, RequestContext, WorkspaceContext } from '@mentrily/service-core';
import { Enrollment } from '../../domain/entities/enrollment.entity.js';
import { LearningCourse } from '../../domain/entities/learning-course.entity.js';

export function requireLearningWorkspace(context: RequestContext): WorkspaceContext {
  const workspace = context.workspace;
  if (!workspace) {
    throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
  }

  return workspace;
}

export function requireLearningActor(
  context: RequestContext,
): WorkspaceContext & { actorId: string } {
  const workspace = requireLearningWorkspace(context);
  if (!workspace.actorId) {
    throw new AppError('UNAUTHORIZED', 'missing actor', 401);
  }

  return workspace as WorkspaceContext & { actorId: string };
}

export function ensureCourseOwnership(course: LearningCourse, context: RequestContext): void {
  const workspace = requireLearningWorkspace(context);
  if (course.tenantId !== workspace.tenantId || course.workspaceId !== workspace.workspaceId) {
    throw new AppError('NOT_FOUND', 'course not found', 404);
  }
}

export function ensureEnrollmentOwnership(enrollment: Enrollment, context: RequestContext): void {
  const workspace = requireLearningWorkspace(context);
  if (
    enrollment.tenantId !== workspace.tenantId ||
    enrollment.workspaceId !== workspace.workspaceId
  ) {
    throw new AppError('NOT_FOUND', 'enrollment not found', 404);
  }
}

export function ensureEnrollmentLearner(enrollment: Enrollment, context: RequestContext): void {
  const workspace = requireLearningActor(context);
  if (enrollment.learnerPrincipalId !== workspace.actorId) {
    throw new AppError('NOT_FOUND', 'enrollment not found', 404);
  }
}
