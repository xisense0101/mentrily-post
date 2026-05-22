import type { MediaAssetContract } from './media-library.js';

export type LearningCourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type LearningVisibility =
  | 'PRIVATE'
  | 'WORKSPACE'
  | 'PUBLIC'
  | 'UNLISTED';

export type LearningContentKind =
  | 'TEXT'
  | 'VIDEO'
  | 'EMBED'
  | 'FILE'
  | 'LIVE_SESSION'
  | 'EXTERNAL_LINK';

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type LearningProgressStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type LearningProgressAction =
  | 'STARTED'
  | 'SEEN'
  | 'COMPLETED'
  | 'RESET';

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
