import { Enrollment } from '../../domain/entities/enrollment.entity.js';
import { LearningEnrollmentResponse } from '../dto/learning-enrollment-response.dto.js';

export function mapEnrollmentToResponse(e: Enrollment): LearningEnrollmentResponse {
  return {
    id: e.id,
    courseId: e.courseId,
    status: String(e.status),
    enrolledAt: e.enrolledAt.toISOString(),
  };
}
