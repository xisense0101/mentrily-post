import type {
  LearningAssessmentLinkScope,
  LearningAssessmentUnlockPolicy,
} from '../../domain/entities/learning-assessment-link.entity.js';

export interface LearningAssessmentLinkResponse {
  id: string;
  scope: LearningAssessmentLinkScope;
  courseId: string;
  sectionId?: string | undefined;
  lessonId?: string | undefined;
  assessmentId: string;
  assessmentTitle: string;
  assessmentStatus: string;
  required: boolean;
  position: number;
  unlockPolicy: LearningAssessmentUnlockPolicy;
  minimumScore?: number | undefined;
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
}
