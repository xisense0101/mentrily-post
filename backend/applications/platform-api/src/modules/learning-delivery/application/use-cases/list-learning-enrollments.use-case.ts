import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { EnrollmentRepository } from '../../domain/repositories/enrollment.repository.js';
import { Enrollment } from '../../domain/entities/enrollment.entity.js';
import { requireLearningActor } from '../support/learning-context.js';

@Injectable()
export class ListLearningEnrollmentsUseCase {
  constructor(
    @Inject(EnrollmentRepository) private readonly enrollmentRepo: EnrollmentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext): Promise<Enrollment[]> {
    const workspace = requireLearningActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_ENROLLMENT_READ, workspace },
      context,
    );
    if (!perm.allowed) throw new AppError('FORBIDDEN', 'permission denied', 403);

    return this.enrollmentRepo.listByLearner(workspace.workspaceId, workspace.actorId);
  }
}
