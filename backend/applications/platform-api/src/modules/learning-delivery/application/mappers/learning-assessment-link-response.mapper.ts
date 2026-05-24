import type { Assessment } from '../../../assessment-delivery/domain/entities/index.js';
import { LearningAssessmentLink } from '../../domain/entities/learning-assessment-link.entity.js';
import type { LearningAssessmentLinkResponse } from '../dto/learning-assessment-link-response.dto.js';

export function mapLearningAssessmentLinkToResponse(
  link: LearningAssessmentLink,
  assessment: Assessment,
): LearningAssessmentLinkResponse {
  return {
    id: link.id,
    scope: link.scope(),
    courseId: link.courseId,
    ...(link.sectionId !== undefined ? { sectionId: link.sectionId } : {}),
    ...(link.lessonId !== undefined ? { lessonId: link.lessonId } : {}),
    assessmentId: assessment.id,
    assessmentTitle: assessment.title,
    assessmentStatus: String(assessment.status),
    required: link.required,
    position: link.position,
    unlockPolicy: link.unlockPolicy,
    ...(link.minimumScore !== undefined ? { minimumScore: link.minimumScore } : {}),
    createdByPrincipalId: link.createdByPrincipalId,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}
