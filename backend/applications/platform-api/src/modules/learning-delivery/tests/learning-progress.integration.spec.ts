import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { PrismaLearningCourseRepository } from '../infrastructure/persistence/prisma/prisma-learning-course.repository.js';
import { PrismaEnrollmentRepository } from '../infrastructure/persistence/prisma/prisma-enrollment.repository.js';
import { PrismaLearningProgressRepository } from '../infrastructure/persistence/prisma/prisma-learning-progress.repository.js';
import { LearningCourse } from '../domain/entities/learning-course.entity.js';
import { LearningSection } from '../domain/entities/learning-section.entity.js';
import { LearningLesson } from '../domain/entities/learning-lesson.entity.js';
import { LearningContentKind } from '../domain/value-objects/learning-content-kind.vo.js';
import { Enrollment } from '../domain/entities/enrollment.entity.js';
import { LearningProgress } from '../domain/entities/learning-progress.entity.js';

describe('PrismaLearningProgressRepository (integration)', () => {
  let prisma: PrismaClient;
  let courseRepo: PrismaLearningCourseRepository;
  let enrollmentRepo: PrismaEnrollmentRepository;
  let progressRepo: PrismaLearningProgressRepository;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    courseRepo = new PrismaLearningCourseRepository(prisma);
    enrollmentRepo = new PrismaEnrollmentRepository(prisma);
    progressRepo = new PrismaLearningProgressRepository(prisma);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  async function seedEnrollment() {
    const courseId = randomUUID();
    const tenantId = randomUUID();
    const workspaceId = randomUUID();
    const learnerPrincipalId = randomUUID();
    const course = LearningCourse.createDraft({
      id: courseId,
      tenantId,
      workspaceId,
      creatorPrincipalId: randomUUID(),
      title: 'Course',
      slug: `course-${courseId}`,
    });

    const section = new LearningSection({
      id: randomUUID(),
      courseId,
      title: 'Section',
      position: 0,
      lessons: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const lesson = new LearningLesson({
      id: randomUUID(),
      sectionId: section.id,
      title: 'Lesson',
      kind: LearningContentKind.TEXT,
      position: 0,
      isRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    section.addLesson(lesson);
    course.addSection(section);
    await courseRepo.save(course);

    const enrollment = Enrollment.create({
      id: randomUUID(),
      tenantId,
      workspaceId,
      courseId,
      learnerPrincipalId,
      enrolledAt: new Date(),
    });
    await enrollmentRepo.save(enrollment);
    return {
      tenantId,
      workspaceId,
      learnerPrincipalId,
      enrollmentId: enrollment.id,
      courseId,
      lessonId: lesson.id,
    };
  }

  it('saves and loads progress and supports unique enrollment+lesson lookup', async () => {
    const { tenantId, workspaceId, enrollmentId, lessonId, courseId, learnerPrincipalId } =
      await seedEnrollment();
    const progress = LearningProgress.createNotStarted({
      id: randomUUID(),
      tenantId,
      workspaceId,
      courseId,
      enrollmentId,
      lessonId,
      learnerPrincipalId,
    });

    const saved = await progressRepo.save(progress);
    const loaded = await progressRepo.findByEnrollmentAndLesson(enrollmentId, lessonId);

    expect(saved.id).toBe(progress.id);
    expect(loaded?.id).toBe(progress.id);
  });

  it('lists progress by enrollment and completed progress subsets', async () => {
    const { tenantId, workspaceId, enrollmentId, lessonId, courseId, learnerPrincipalId } =
      await seedEnrollment();
    const started = LearningProgress.createNotStarted({
      id: randomUUID(),
      tenantId,
      workspaceId,
      courseId,
      enrollmentId,
      lessonId,
      learnerPrincipalId,
    });
    started.markSeen();
    const completed = LearningProgress.createNotStarted({
      id: randomUUID(),
      tenantId,
      workspaceId,
      courseId,
      enrollmentId,
      lessonId: randomUUID(),
      learnerPrincipalId,
    });
    completed.markCompleted();

    await progressRepo.save(started);
    await progressRepo.save(completed);

    const all = await progressRepo.listByEnrollment(enrollmentId);
    const done = await progressRepo.listCompletedByEnrollment(enrollmentId);

    expect(all).toHaveLength(2);
    expect(done).toHaveLength(1);
    expect(done[0]?.status).toBe('COMPLETED');
  });

  it('persists status transitions and timestamps', async () => {
    const { tenantId, workspaceId, enrollmentId, lessonId, courseId, learnerPrincipalId } =
      await seedEnrollment();
    const progress = LearningProgress.createNotStarted({
      id: randomUUID(),
      tenantId,
      workspaceId,
      courseId,
      enrollmentId,
      lessonId,
      learnerPrincipalId,
    });
    progress.markSeen();
    progress.markCompleted();

    const saved = await progressRepo.save(progress);
    expect(saved.status).toBe('COMPLETED');
    expect(saved.startedAt).toBeInstanceOf(Date);
    expect(saved.completedAt).toBeInstanceOf(Date);
    expect(saved.lastSeenAt).toBeInstanceOf(Date);
  });
});
