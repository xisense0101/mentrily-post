import type { MediaAssetContract } from '../media-library/index.js';

export type LearningCourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type LearningVisibility = 'PRIVATE' | 'WORKSPACE' | 'PUBLIC' | 'UNLISTED';

export type LearningContentKind =
  | 'TEXT'
  | 'VIDEO'
  | 'EMBED'
  | 'FILE'
  | 'LIVE_SESSION'
  | 'EXTERNAL_LINK';

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type LearningProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type LearningProgressAction = 'STARTED' | 'SEEN' | 'COMPLETED' | 'RESET';

export type LearningAssessmentUnlockPolicy = 'IMMEDIATE' | 'AFTER_LESSON_COMPLETE';

export type LearnerLinkedAssessmentStatus =
  | 'NOT_STARTED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'AWAITING_GRADING'
  | 'RESULT_RELEASED'
  | 'PASSED'
  | 'FAILED'
  | 'UNAVAILABLE';

export interface LearningLessonContract {
  id: string;
  title: string;
  kind: LearningContentKind;
  position: number;
  estimatedMinutes?: number | undefined;
  contentRef?: string | undefined;
  isRequired: boolean;
  mediaAsset?: MediaAssetContract | undefined;
}

export interface LearningSectionContract {
  id: string;
  title: string;
  position: number;
  lessons: LearningLessonContract[];
}

export interface LearningCourseContract {
  id: string;
  title: string;
  slug: string;
  description?: string | undefined;
  status: LearningCourseStatus;
  visibility: LearningVisibility;
  publishedAt?: string | undefined;
  archivedAt?: string | undefined;
  sections: LearningSectionContract[];
}

export interface LearningEnrollmentContract {
  id: string;
  courseId: string;
  learnerPrincipalId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  cancelledAt?: string | undefined;
}

export interface LearningProgressContract {
  id: string;
  enrollmentId: string;
  lessonId: string;
  learnerPrincipalId: string;
  status: LearningProgressStatus;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  lastSeenAt?: string | undefined;
}

export interface LearningAssessmentLinkContract {
  id: string;
  courseId: string;
  sectionId?: string | undefined;
  lessonId?: string | undefined;
  assessmentId: string;
  required: boolean;
  position: number;
  unlockPolicy: LearningAssessmentUnlockPolicy;
  minimumScore?: number | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerLinkedAssessmentContract {
  id: string;
  courseId: string;
  sectionId?: string | undefined;
  lessonId?: string | undefined;
  assessmentId: string;
  assessmentTitle?: string | undefined;
  required: boolean;
  position: number;
  unlockPolicy: LearningAssessmentUnlockPolicy;
  minimumScore?: number | undefined;
  status: LearnerLinkedAssessmentStatus;
  available: boolean;
  attemptId?: string | undefined;
  resultReleased: boolean;
  releasedAt?: string | undefined;
  score?: number | undefined;
  maxScore?: number | undefined;
  passed?: boolean | undefined;
  blockingCompletion: boolean;
  unavailableReason?: string | undefined;
}

export interface LearnerLessonDeliveryContract extends LearningLessonContract {
  progress?: LearningProgressContract | undefined;
  linkedAssessments: LearnerLinkedAssessmentContract[];
}

export interface LearnerSectionDeliveryContract extends LearningSectionContract {
  lessons: LearnerLessonDeliveryContract[];
}

export interface CourseAssessmentProgressSummaryContract {
  courseId: string;
  totalLinkedAssessments: number;
  requiredAssessments: number;
  learnersAssigned: number;
  attemptsStarted: number;
  submissions: number;
  pendingGrading: number;
  resultsReleased: number;
  blockedRequiredAssessments: number;
  completedRequiredAssessments: number;
  passRate?: number | undefined;
}

export interface LearnerCourseDeliveryContract {
  course: LearningCourseContract;
  enrollment: LearningEnrollmentContract;
  sections: LearnerSectionDeliveryContract[];
  courseLinkedAssessments: LearnerLinkedAssessmentContract[];
  summary: {
    totalLinkedAssessments: number;
    requiredAssessments: number;
    completedRequiredAssessments: number;
    blockedRequiredAssessments: number;
    canCompleteCourse: boolean;
  };
}

export interface CreateLearningCourseRequest {
  title: string;
  slug: string;
  description?: string | undefined;
  visibility?: LearningVisibility | undefined;
}

export interface UpdateLearningCourseRequest {
  title?: string | undefined;
  description?: string | null | undefined;
  visibility?: LearningVisibility | undefined;
}

export interface AddLearningSectionRequest {
  title: string;
}

export interface AddLearningLessonRequest {
  title: string;
  kind: LearningContentKind;
  estimatedMinutes?: number | undefined;
  contentRef?: string | undefined;
  isRequired?: boolean | undefined;
}

export interface ReorderLearningSectionsRequest {
  orderedSectionIds: string[];
}

export interface ReorderLearningLessonsRequest {
  orderedLessonIds: string[];
}

export type EnrollInLearningCourseRequest = Record<string, never>;

export interface MarkLearningProgressRequest {
  action: LearningProgressAction;
}

export interface CreateLearningAssessmentLinkRequest {
  assessmentId: string;
  required?: boolean | undefined;
  position?: number | undefined;
  unlockPolicy?: LearningAssessmentUnlockPolicy | undefined;
  minimumScore?: number | undefined;
  lessonId?: string | undefined;
}

export interface UpdateLearningAssessmentLinkRequest {
  required?: boolean | undefined;
  position?: number | undefined;
  unlockPolicy?: LearningAssessmentUnlockPolicy | undefined;
  minimumScore?: number | null | undefined;
}
