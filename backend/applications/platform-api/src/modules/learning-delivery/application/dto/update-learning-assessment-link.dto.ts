import type { LearningAssessmentUnlockPolicy } from '../../domain/entities/learning-assessment-link.entity.js';

export interface UpdateLearningAssessmentLinkInput {
  required?: boolean | undefined;
  position?: number | undefined;
  unlockPolicy?: LearningAssessmentUnlockPolicy | undefined;
  minimumScore?: number | null | undefined;
}
