export interface LearningEnrollmentResponse {
  id: string;
  courseId: string;
  status: string;
  enrolledAt: string;
}

export interface LearningProgressResponse {
  id: string;
  enrollmentId: string;
  lessonId: string;
  status: string;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  lastSeenAt?: string | undefined;
}
