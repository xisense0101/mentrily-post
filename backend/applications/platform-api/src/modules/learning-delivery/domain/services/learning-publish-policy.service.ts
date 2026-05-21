import { LearningCourse } from '../entities/learning-course.entity.js';
import { LearningCourseStatus } from '../value-objects/learning-course-status.vo.js';

export class LearningPublishPolicyService {
  canPublish(course: LearningCourse): { allowed: boolean; reason?: string } {
    if (!course) return { allowed: false, reason: 'missing course' };
    if (course.status === LearningCourseStatus.ARCHIVED)
      return { allowed: false, reason: 'archived courses cannot be published' };
    if (course.status !== LearningCourseStatus.DRAFT)
      return { allowed: false, reason: 'only DRAFT courses can be published' };
    if (!course.sections || course.sections.length === 0)
      return { allowed: false, reason: 'course must have at least one section' };

    const hasLessonInAnySection = course.sections.some((s) => s.lessons && s.lessons.length > 0);
    if (!hasLessonInAnySection)
      return {
        allowed: false,
        reason: 'course must have at least one lesson in at least one section',
      };

    for (const s of course.sections) {
      if (!s.title || s.title.trim() === '')
        return { allowed: false, reason: 'every section must have a title' };
      if (!s.lessons) return { allowed: false, reason: 'every section must contain lessons array' };
      for (const l of s.lessons) {
        if (!l.title || l.title.trim() === '')
          return { allowed: false, reason: 'every lesson must have a title' };
      }
    }

    return { allowed: true };
  }
}
