import { LearningCourse } from '../../domain/entities/learning-course.entity.js';
import { LearningCourseResponse } from '../dto/learning-course-response.dto.js';

export function mapCourseToResponse(course: LearningCourse): LearningCourseResponse {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    ...(course.description !== undefined ? { description: course.description } : {}),
    status: String(course.status),
    visibility: String(course.visibility),
    sections: course.sections.map((s) => ({
      id: s.id,
      title: s.title,
      position: s.position,
      lessons: s.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        kind: String(l.kind),
        position: l.position,
        estimatedMinutes: l.estimatedMinutes ?? undefined,
        contentRef: l.contentRef ?? undefined,
        isRequired: l.isRequired,
      })),
    })),
  };
}
