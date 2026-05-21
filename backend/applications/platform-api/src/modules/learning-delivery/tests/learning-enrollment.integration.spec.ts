import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { PrismaLearningCourseRepository } from '../infrastructure/persistence/prisma/prisma-learning-course.repository.js';
import { PrismaEnrollmentRepository } from '../infrastructure/persistence/prisma/prisma-enrollment.repository.js';
import { LearningCourse } from '../domain/entities/learning-course.entity.js';
import { LearningSection } from '../domain/entities/learning-section.entity.js';
import { LearningLesson } from '../domain/entities/learning-lesson.entity.js';
import { LearningContentKind } from '../domain/value-objects/learning-content-kind.vo.js';
import { Enrollment } from '../domain/entities/enrollment.entity.js';

describe('PrismaEnrollmentRepository (integration)', () => {
  let prisma: PrismaClient;
  let courseRepo: PrismaLearningCourseRepository;
  let enrollmentRepo: PrismaEnrollmentRepository;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    courseRepo = new PrismaLearningCourseRepository(prisma);
    enrollmentRepo = new PrismaEnrollmentRepository(prisma);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  async function seedCourse() {
    const courseId = randomUUID();
    const tenantId = randomUUID();
    const workspaceId = randomUUID();
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

    section.addLesson(
      new LearningLesson({
        id: randomUUID(),
        sectionId: section.id,
        title: 'Lesson',
        kind: LearningContentKind.TEXT,
        position: 0,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    course.addSection(section);
    return courseRepo.save(course);
  }

  it('saves and loads enrollment and supports workspace/course/learner lookup', async () => {
    const course = await seedCourse();
    const learnerPrincipalId = randomUUID();
    const enrollment = Enrollment.create({
      id: randomUUID(),
      tenantId: course.tenantId,
      workspaceId: course.workspaceId,
      courseId: course.id,
      learnerPrincipalId,
      enrolledAt: new Date(),
    });

    const saved = await enrollmentRepo.save(enrollment);
    const loaded = await enrollmentRepo.findByWorkspaceCourseAndLearner(
      course.workspaceId,
      course.id,
      learnerPrincipalId,
    );

    expect(saved.id).toBe(enrollment.id);
    expect(loaded?.id).toBe(enrollment.id);
  });

  it('enforces unique workspace course learner enrollment', async () => {
    const course = await seedCourse();
    const learnerPrincipalId = randomUUID();
    const buildEnrollment = () =>
      Enrollment.create({
        id: randomUUID(),
        tenantId: course.tenantId,
        workspaceId: course.workspaceId,
        courseId: course.id,
        learnerPrincipalId,
        enrolledAt: new Date(),
      });

    await enrollmentRepo.save(buildEnrollment());
    await expect(enrollmentRepo.save(buildEnrollment())).rejects.toThrow();
  });

  it('lists learner and course enrollments and persists timestamps', async () => {
    const course = await seedCourse();
    const learnerPrincipalId = randomUUID();
    const enrollment = Enrollment.create({
      id: randomUUID(),
      tenantId: course.tenantId,
      workspaceId: course.workspaceId,
      courseId: course.id,
      learnerPrincipalId,
      enrolledAt: new Date(),
    });

    enrollment.start();
    enrollment.complete();
    const saved = await enrollmentRepo.save(enrollment);

    const byLearner = await enrollmentRepo.listByLearner(course.workspaceId, learnerPrincipalId);
    const byCourse = await enrollmentRepo.listByCourse(course.id);

    expect(byLearner).toHaveLength(1);
    expect(byCourse).toHaveLength(1);
    expect(saved.startedAt).toBeInstanceOf(Date);
    expect(saved.completedAt).toBeInstanceOf(Date);
  });
});
