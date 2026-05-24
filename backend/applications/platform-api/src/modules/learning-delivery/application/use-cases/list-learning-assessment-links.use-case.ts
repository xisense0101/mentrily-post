import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AssessmentRepository } from '../../../assessment-delivery/domain/repositories/index.js';
import { LearningCourseRepository } from '../../domain/repositories/learning-course.repository.js';
import { LearningAssessmentLinkRepository } from '../../domain/repositories/learning-assessment-link.repository.js';
import { LearningAssessmentLinkResponse } from '../dto/learning-assessment-link-response.dto.js';
import { requireLearningActor, ensureCourseOwnership } from '../support/learning-context.js';
import { mapLearningAssessmentLinkToResponse } from '../mappers/learning-assessment-link-response.mapper.js';

@Injectable()
export class ListLearningAssessmentLinksUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly courseRepo: LearningCourseRepository,
    @Inject(LearningAssessmentLinkRepository)
    private readonly linkRepo: LearningAssessmentLinkRepository,
    @Inject(AssessmentRepository) private readonly assessmentRepo: AssessmentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    courseId: string,
  ): Promise<LearningAssessmentLinkResponse[]> {
    const workspace = requireLearningActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_ASSESSMENT_LINK_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new AppError('NOT_FOUND', 'course not found', 404);
    }
    ensureCourseOwnership(course, context);

    const links = await this.linkRepo.listByCourse(course.id);
    const results: LearningAssessmentLinkResponse[] = [];
    for (const link of links) {
      const assessment = await this.assessmentRepo.findById(link.assessmentId);
      if (assessment) {
        results.push(mapLearningAssessmentLinkToResponse(link, assessment));
      }
    }

    return results;
  }
}
