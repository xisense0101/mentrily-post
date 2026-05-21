import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { PrismaLearningCourseRepository } from '../infrastructure/persistence/prisma/prisma-learning-course.repository.js';
import { LearningCourse } from '../domain/entities/learning-course.entity.js';
import { LearningSection } from '../domain/entities/learning-section.entity.js';
import { LearningLesson } from '../domain/entities/learning-lesson.entity.js';
import { LearningContentKind } from '../domain/value-objects/learning-content-kind.vo.js';

describe('PrismaLearningCourseRepository (integration)', () => {
  let prisma: PrismaService;
  let repo: PrismaLearningCourseRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repo = new PrismaLearningCourseRepository(prisma);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  function buildCourse(slug = 'course-one', workspaceId = randomUUID()) {
    const courseId = randomUUID();
    const sectionId = randomUUID();
    const lessonId = randomUUID();
    const tenantId = randomUUID();
    const actorId = randomUUID();

    const course = LearningCourse.createDraft({
      id: courseId,
      tenantId,
      workspaceId,
      creatorPrincipalId: actorId,
      title: 'Course',
      slug,
    });
    const section = new LearningSection({
      id: sectionId,
      courseId,
      title: 'Section',
      position: 0,
      lessons: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    section.addLesson(
      new LearningLesson({
        id: lessonId,
        sectionId,
        title: 'Lesson',
        kind: LearningContentKind.TEXT,
        position: 0,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    course.addSection(section);
    return { course, courseId };
  }

  it('persists and loads a draft course with nested sections and lessons', async () => {
    const { course, courseId } = buildCourse();
    const saved = await repo.save(course);
    const loaded = await repo.findById(saved.id);
    expect(loaded?.id).toBe(courseId);
    expect(loaded?.sections).toHaveLength(1);
    expect(loaded?.sections[0]?.lessons).toHaveLength(1);
  });

  it('enforces workspace slug uniqueness', async () => {
    const workspaceId = randomUUID();
    const first = buildCourse('same-slug', workspaceId);
    const second = buildCourse('same-slug', workspaceId);
    await repo.save(first.course);
    await expect(repo.save(second.course)).rejects.toThrow();
  });

  it('updates aggregate after section and lesson changes', async () => {
    const { course } = buildCourse('mutable-course');
    const saved = await repo.save(course);
    saved.addSection(
      new LearningSection({
        id: randomUUID(),
        courseId: saved.id,
        title: 'Second section',
        position: 1,
        lessons: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    const updated = await repo.save(saved);
    expect(updated.sections).toHaveLength(2);
  });

  it('persists published and archived state', async () => {
    const { course } = buildCourse('published-course');
    course.publish();
    const published = await repo.save(course);
    expect(published.status).toBe('PUBLISHED');
    published.archive();
    const archived = await repo.save(published);
    expect(archived.status).toBe('ARCHIVED');
  });
});
