import type {
  LearningCourseResponse,
  LearningLessonResponse,
  LearningSectionResponse,
} from './learning-course-response.dto.js';
import type {
  LearningEnrollmentResponse,
  LearningProgressResponse,
} from './learning-enrollment-response.dto.js';
import type { LearnerLinkedAssessmentStatus } from '../services/learning-assessment-link-policy.service.js';

export interface LearnerLinkedAssessmentResponse {
  id: string;
  courseId: string;
  sectionId?: string | undefined;
  lessonId?: string | undefined;
  assessmentId: string;
  assessmentTitle?: string | undefined;
  required: boolean;
  position: number;
  unlockPolicy: string;
  minimumScore?: number | undefined;
  status: LearnerLinkedAssessmentStatus;
  available: boolean;
  attemptId?: string | undefined;
  attemptStatus?: string | undefined;
  gradingStatus?: string | undefined;
  resultReleased: boolean;
  releasedAt?: string | undefined;
  score?: number | undefined;
  maxScore?: number | undefined;
  passed?: boolean | undefined;
  blockingCompletion: boolean;
  unavailableReason?: string | undefined;
}

export interface LearnerLessonDeliveryResponse extends LearningLessonResponse {
  progress?: LearningProgressResponse | undefined;
  linkedAssessments: LearnerLinkedAssessmentResponse[];
}

export interface LearnerSectionDeliveryResponse extends LearningSectionResponse {
  lessons: LearnerLessonDeliveryResponse[];
}

export interface LearnerCourseAssessmentSummaryResponse {
  totalLinkedAssessments: number;
  requiredAssessments: number;
  completedRequiredAssessments: number;
  blockedRequiredAssessments: number;
  canCompleteCourse: boolean;
}

export interface LearnerCourseDeliveryResponse {
  course: LearningCourseResponse;
  enrollment: LearningEnrollmentResponse;
  sections: LearnerSectionDeliveryResponse[];
  courseLinkedAssessments: LearnerLinkedAssessmentResponse[];
  summary: LearnerCourseAssessmentSummaryResponse;
}
