import { describe, it, expect } from 'vitest';
import { LearningPublishPolicyService } from '../domain/services/learning-publish-policy.service.js';
import { ProgressCompletionPolicyService } from '../domain/services/progress-completion-policy.service.js';
import { LearningCourse } from '../domain/entities/learning-course.entity.js';
import { LearningSection } from '../domain/entities/learning-section.entity.js';
import { LearningLesson } from '../domain/entities/learning-lesson.entity.js';
import { LearningContentKind } from '../domain/value-objects/learning-content-kind.vo.js';
import { LearningCourseStatus } from '../domain/value-objects/learning-course-status.vo.js';

describe('Learning policies', () => {
  const mkCourse = (id: string) =>
    LearningCourse.createDraft({
      id,
      tenantId: 't',
      workspaceId: 'w',
      creatorPrincipalId: 'p',
      title: 'C',
      slug: `slug-${id}`,
    });

  const mkSection = (id: string, title = 'S') =>
    new LearningSection({
      id,
      courseId: 'placeholder',
      title,
      position: 0,
      lessons: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  const mkLesson = (id: string, sectionId: string, title = 'L') =>
    new LearningLesson({
      id,
      sectionId,
      title,
      kind: LearningContentKind.TEXT,
      position: 0,
      isRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  it('valid draft course is allowed', () => {
    const svc = new LearningPublishPolicyService();
    const c = mkCourse('1');
    const s = mkSection('s1');
    const l = mkLesson('l1', 's1');
    s.addLesson(l);
    c.addSection(s);
    expect(svc.canPublish(c).allowed).toBe(true);
  });

  it('archived course is denied', () => {
    const svc = new LearningPublishPolicyService();
    const c = mkCourse('2');
    c.archive();
    expect(svc.canPublish(c).allowed).toBe(false);
  });

  it('published course is denied', () => {
    const svc = new LearningPublishPolicyService();
    const c = mkCourse('3');
    const s = mkSection('s3');
    s.addLesson(mkLesson('l3', 's3'));
    c.addSection(s);
    c.publish();
    expect(c.status).toBe(LearningCourseStatus.PUBLISHED);
    expect(svc.canPublish(c).allowed).toBe(false);
  });

  it('course with no sections is denied', () => {
    const svc = new LearningPublishPolicyService();
    const c = mkCourse('4');
    expect(svc.canPublish(c).allowed).toBe(false);
  });

  it('course with sections but no lessons is denied', () => {
    const svc = new LearningPublishPolicyService();
    const c = mkCourse('5');
    c.addSection(mkSection('s5'));
    expect(svc.canPublish(c).allowed).toBe(false);
  });

  it('completion policy requires required lessons', () => {
    const psvc = new ProgressCompletionPolicyService();
    expect(psvc.canCompleteCourse({ requiredLessonIds: [], completedLessonIds: [] })).toBe(false);
    expect(
      psvc.canCompleteCourse({ requiredLessonIds: ['a', 'b'], completedLessonIds: ['a'] }),
    ).toBe(false);
    expect(psvc.canCompleteCourse({ requiredLessonIds: ['a'], completedLessonIds: ['a'] })).toBe(
      true,
    );
  });
});
