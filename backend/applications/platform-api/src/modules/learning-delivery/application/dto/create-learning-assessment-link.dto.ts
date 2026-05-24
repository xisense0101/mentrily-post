import type { LearningAssessmentUnlockPolicy } from '../../domain/entities/learning-assessment-link.entity.js';

export interface CreateLearningAssessmentLinkInput {
  assessmentId: string;
  required?: boolean | undefined;
  position?: number | undefined;
  unlockPolicy?: LearningAssessmentUnlockPolicy | undefined;
  minimumScore?: number | undefined;
}
