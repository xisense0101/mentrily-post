import type { LearningAssessmentLink as PersistenceLink } from '@prisma/client';
import { LearningAssessmentLink } from '../../../domain/entities/learning-assessment-link.entity.js';

export function toDomainLearningAssessmentLink(record: PersistenceLink): LearningAssessmentLink {
  return new LearningAssessmentLink({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    courseId: record.courseId,
    ...(record.sectionId !== null ? { sectionId: record.sectionId } : {}),
    ...(record.lessonId !== null ? { lessonId: record.lessonId } : {}),
    assessmentId: record.assessmentId,
    required: record.required,
    position: record.position,
    unlockPolicy: record.unlockPolicy,
    ...(record.minimumScore !== null ? { minimumScore: record.minimumScore } : {}),
    createdByPrincipalId: record.createdByPrincipalId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toPersistenceLearningAssessmentLinkCreate(link: LearningAssessmentLink) {
  return {
    id: link.id,
    tenantId: link.tenantId,
    workspaceId: link.workspaceId,
    courseId: link.courseId,
    ...(link.sectionId !== undefined ? { sectionId: link.sectionId } : {}),
    ...(link.lessonId !== undefined ? { lessonId: link.lessonId } : {}),
    assessmentId: link.assessmentId,
    required: link.required,
    position: link.position,
    unlockPolicy: link.unlockPolicy,
    ...(link.minimumScore !== undefined ? { minimumScore: link.minimumScore } : {}),
    createdByPrincipalId: link.createdByPrincipalId,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}

export function toPersistenceLearningAssessmentLinkUpdate(link: LearningAssessmentLink) {
  return {
    tenantId: link.tenantId,
    workspaceId: link.workspaceId,
    courseId: link.courseId,
    ...(link.sectionId !== undefined ? { sectionId: link.sectionId } : { sectionId: null }),
    ...(link.lessonId !== undefined ? { lessonId: link.lessonId } : { lessonId: null }),
    assessmentId: link.assessmentId,
    required: link.required,
    position: link.position,
    unlockPolicy: link.unlockPolicy,
    ...(link.minimumScore !== undefined
      ? { minimumScore: link.minimumScore }
      : { minimumScore: null }),
    createdByPrincipalId: link.createdByPrincipalId,
    updatedAt: link.updatedAt,
  };
}
