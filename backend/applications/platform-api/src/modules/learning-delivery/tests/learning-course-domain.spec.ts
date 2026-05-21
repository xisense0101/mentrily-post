import { describe, it, expect } from 'vitest';
import { LearningCourse } from '../domain/entities/learning-course.entity.js';
import { LearningSection } from '../domain/entities/learning-section.entity.js';
import { LearningLesson } from '../domain/entities/learning-lesson.entity.js';
import { LearningCourseStatus } from '../domain/value-objects/learning-course-status.vo.js';
import { LearningContentKind } from '../domain/value-objects/learning-content-kind.vo.js';

describe('LearningCourse domain', () => {
  const mkCourse = (id = 'c1') =>
    LearningCourse.createDraft({
      id,
      tenantId: 't1',
      workspaceId: 'w1',
      creatorPrincipalId: 'p1',
      title: 'Course',
      slug: `course-${id}`,
    });

  const mkSection = (id: string, position: number) =>
    new LearningSection({
      id,
      courseId: 'placeholder',
      title: `Section ${id}`,
      position,
      lessons: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  const mkLesson = (id: string, sectionId: string, position: number, estimatedMinutes?: number) =>
    new LearningLesson({
      id,
      sectionId,
      title: `Lesson ${id}`,
      kind: LearningContentKind.TEXT,
      position,
      isRequired: true,
      ...(estimatedMinutes !== undefined ? { estimatedMinutes } : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  it('creates a draft course with tenant/workspace/creator and publishedAt is undefined before publish', () => {
    const c = LearningCourse.createDraft({
      id: 'c0',
      tenantId: 't1',
      workspaceId: 'w1',
      creatorPrincipalId: 'p1',
      title: 'My Course',
      slug: 'my-course',
      description: 'desc',
    });
    expect(c.status).toBe(LearningCourseStatus.DRAFT);
    expect(c.tenantId).toBe('t1');
    expect(c.publishedAt).toBeUndefined();
  });

  it('rejects invalid title or slug', () => {
    expect(() =>
      LearningCourse.createDraft({
        id: 'c2',
        tenantId: 't',
        workspaceId: 'w',
        creatorPrincipalId: 'p',
        title: '',
        slug: 'ok',
      }),
    ).toThrow();
    expect(() =>
      LearningCourse.createDraft({
        id: 'c2',
        tenantId: 't',
        workspaceId: 'w',
        creatorPrincipalId: 'p',
        title: 'x',
        slug: 'Invalid Slug',
      }),
    ).toThrow();
  });

  it('updateDescription(undefined) clears description', () => {
    const c = LearningCourse.createDraft({
      id: 'c3',
      tenantId: 't',
      workspaceId: 'w',
      creatorPrincipalId: 'p',
      title: 'Course',
      slug: 'course-3',
      description: 'desc',
    });
    expect(c.description).toBe('desc');
    c.updateDescription(undefined);
    expect(c.description).toBeUndefined();
  });

  it('can publish with content and sets publishedAt; published course cannot publish again', () => {
    const c = mkCourse('4');
    const s = mkSection('s1', 0);
    s.addLesson(mkLesson('l1', 'wrong-id', 0));
    c.addSection(s);
    c.publish();
    expect(c.status).toBe(LearningCourseStatus.PUBLISHED);
    expect(c.publishedAt).toBeDefined();
    expect(() => c.publish()).toThrow();
  });

  it('cannot publish without sections or lessons', () => {
    const c = mkCourse('5');
    expect(() => c.publish()).toThrow();
    c.addSection(mkSection('s2', 0));
    expect(() => c.publish()).toThrow();
  });

  it('archived course cannot add/remove/reorder sections', () => {
    const c = mkCourse('6');
    c.addSection(mkSection('s1', 0));
    c.archive();
    expect(() => c.addSection(mkSection('s2', 1))).toThrow();
    expect(() => c.removeSection('s1')).toThrow();
    expect(() => c.reorderSections(['s1'])).toThrow();
  });

  it('adding a section normalizes positions', () => {
    const c = mkCourse('7');
    c.addSection(mkSection('s2', 8));
    c.addSection(mkSection('s1', 3));
    expect(c.sections.map((s) => s.id)).toEqual(['s2', 's1']);
    expect(c.sections.map((s) => s.position)).toEqual([0, 1]);
  });

  it('section reorder is deterministic and validates missing/duplicate/unknown ids', () => {
    const c = mkCourse('8');
    c.addSection(mkSection('s1', 0));
    c.addSection(mkSection('s2', 1));
    c.addSection(mkSection('s3', 2));

    c.reorderSections(['s3', 's1', 's2']);
    expect(c.sections.map((s) => s.id)).toEqual(['s3', 's1', 's2']);
    expect(c.sections.map((s) => s.position)).toEqual([0, 1, 2]);

    expect(() => c.reorderSections(['s1', 's2'])).toThrow();
    expect(() => c.reorderSections(['s1', 's1', 's2'])).toThrow();
    expect(() => c.reorderSections(['s1', 's2', 's4'])).toThrow();
  });

  it('adding lesson through section forces lesson.sectionId and reorders deterministically with invariants', () => {
    const section = mkSection('s10', 0);
    const l1 = mkLesson('l1', 'other-section', 8);
    const l2 = mkLesson('l2', 'other-section', 1);
    section.addLesson(l1);
    section.addLesson(l2);

    expect(section.lessons[0]?.sectionId).toBe('s10');
    expect(section.lessons[1]?.sectionId).toBe('s10');

    section.reorderLessons(['l2', 'l1']);
    expect(section.lessons.map((l) => l.id)).toEqual(['l2', 'l1']);
    expect(section.lessons.map((l) => l.position)).toEqual([0, 1]);

    expect(() => section.reorderLessons(['l1'])).toThrow();
    expect(() => section.reorderLessons(['l1', 'l1'])).toThrow();
    expect(() => section.reorderLessons(['l1', 'l3'])).toThrow();
  });

  it('lesson constructor enforces negative position and non-positive estimatedMinutes rules', () => {
    expect(() => mkLesson('l3', 's1', -1)).toThrow();
    expect(() => mkLesson('l4', 's1', 0, 0)).toThrow();
    expect(() => mkLesson('l5', 's1', 0, -3)).toThrow();
  });

  it('optional lesson fields work when omitted', () => {
    const lesson = mkLesson('l6', 's1', 0);
    expect(lesson.estimatedMinutes).toBeUndefined();
    expect(lesson.contentRef).toBeUndefined();
  });
});
