import type { Prisma } from '@prisma/client';
import { LearningCourse } from '../../../domain/entities/learning-course.entity.js';
import { LearningSection } from '../../../domain/entities/learning-section.entity.js';
import { LearningLesson } from '../../../domain/entities/learning-lesson.entity.js';
import { Enrollment } from '../../../domain/entities/enrollment.entity.js';
import { LearningProgress } from '../../../domain/entities/learning-progress.entity.js';
import { LearningContentKind } from '../../../domain/value-objects/learning-content-kind.vo.js';
import { LearningCourseStatus } from '../../../domain/value-objects/learning-course-status.vo.js';
import { LearningVisibility } from '../../../domain/value-objects/learning-visibility.vo.js';
import { EnrollmentStatus } from '../../../domain/value-objects/enrollment-status.vo.js';
import { LearningProgressStatus } from '../../../domain/value-objects/learning-progress-status.vo.js';

type LearningCourseRecord = Prisma.LearningCourseGetPayload<{
  include: {
    sections: {
      include: {
        lessons: true;
      };
    };
  };
}>;

type LearningEnrollmentRecord = Prisma.LearningEnrollmentGetPayload<object>;
type LearningProgressRecord = Prisma.LearningProgressGetPayload<object>;

export function toDomainCourse(record: LearningCourseRecord): LearningCourse {
  const sections = record.sections.map(
    (section) =>
      new LearningSection({
        id: section.id,
        courseId: section.courseId,
        title: section.title,
        position: section.position,
        lessons: section.lessons.map((lesson) => {
          const lessonProps = {
            id: lesson.id,
            sectionId: lesson.sectionId,
            title: lesson.title,
            kind: toDomainLearningContentKind(lesson.kind),
            position: lesson.position,
            isRequired: lesson.isRequired,
            createdAt: new Date(lesson.createdAt),
            updatedAt: new Date(lesson.updatedAt),
            ...(lesson.estimatedMinutes !== null
              ? { estimatedMinutes: lesson.estimatedMinutes }
              : {}),
            ...(lesson.contentRef !== null ? { contentRef: lesson.contentRef } : {}),
          };

          return new LearningLesson(lessonProps);
        }),
        createdAt: new Date(section.createdAt),
        updatedAt: new Date(section.updatedAt),
      }),
  );

  return new LearningCourse({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    creatorPrincipalId: record.creatorPrincipalId,
    title: record.title,
    slug: record.slug,
    ...(record.description !== null ? { description: record.description } : {}),
    status: toDomainLearningCourseStatus(record.status),
    visibility: toDomainLearningVisibility(record.visibility),
    sections,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    ...(record.publishedAt ? { publishedAt: new Date(record.publishedAt) } : {}),
    ...(record.archivedAt ? { archivedAt: new Date(record.archivedAt) } : {}),
  });
}

export function toDomainCourseOrNull(record: LearningCourseRecord | null): LearningCourse | null {
  return record ? toDomainCourse(record) : null;
}

export function toPersistenceCourseCreate(course: LearningCourse) {
  return {
    id: course.id,
    tenantId: course.tenantId,
    workspaceId: course.workspaceId,
    creatorPrincipalId: course.creatorPrincipalId,
    title: course.title,
    slug: course.slug,
    description: course.description ?? null,
    status: course.status,
    visibility: course.visibility,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    publishedAt: course.publishedAt ?? null,
    archivedAt: course.archivedAt ?? null,
  };
}

export function toPersistenceSection(section: LearningSection) {
  return {
    id: section.id,
    courseId: section.courseId,
    title: section.title,
    position: section.position,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

export function toPersistenceLesson(lesson: LearningLesson) {
  return {
    id: lesson.id,
    sectionId: lesson.sectionId,
    title: lesson.title,
    kind: lesson.kind,
    position: lesson.position,
    estimatedMinutes: lesson.estimatedMinutes ?? null,
    contentRef: lesson.contentRef ?? null,
    isRequired: lesson.isRequired,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

export function toDomainEnrollment(record: LearningEnrollmentRecord | null): Enrollment | null {
  if (!record) {
    return null;
  }

  return new Enrollment({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    courseId: record.courseId,
    learnerPrincipalId: record.learnerPrincipalId,
    status: toDomainEnrollmentStatus(record.status),
    enrolledAt: new Date(record.enrolledAt),
    ...(record.startedAt ? { startedAt: new Date(record.startedAt) } : {}),
    ...(record.completedAt ? { completedAt: new Date(record.completedAt) } : {}),
    ...(record.cancelledAt ? { cancelledAt: new Date(record.cancelledAt) } : {}),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  });
}

export function toPersistenceEnrollmentCreate(enrollment: Enrollment) {
  return {
    id: enrollment.id,
    tenantId: enrollment.tenantId,
    workspaceId: enrollment.workspaceId,
    courseId: enrollment.courseId,
    learnerPrincipalId: enrollment.learnerPrincipalId,
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
    startedAt: enrollment.startedAt ?? null,
    completedAt: enrollment.completedAt ?? null,
    cancelledAt: enrollment.cancelledAt ?? null,
    createdAt: enrollment.createdAt,
    updatedAt: enrollment.updatedAt,
  };
}

export function toDomainProgress(record: LearningProgressRecord | null): LearningProgress | null {
  if (!record) {
    return null;
  }

  return new LearningProgress({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    courseId: record.courseId,
    enrollmentId: record.enrollmentId,
    lessonId: record.lessonId,
    learnerPrincipalId: record.learnerPrincipalId,
    status: toDomainLearningProgressStatus(record.status),
    ...(record.startedAt ? { startedAt: new Date(record.startedAt) } : {}),
    ...(record.completedAt ? { completedAt: new Date(record.completedAt) } : {}),
    ...(record.lastSeenAt ? { lastSeenAt: new Date(record.lastSeenAt) } : {}),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  });
}

export function toPersistenceProgressCreate(progress: LearningProgress) {
  return {
    id: progress.id,
    tenantId: progress.tenantId,
    workspaceId: progress.workspaceId,
    courseId: progress.courseId,
    enrollmentId: progress.enrollmentId,
    lessonId: progress.lessonId,
    learnerPrincipalId: progress.learnerPrincipalId,
    status: progress.status,
    startedAt: progress.startedAt ?? null,
    completedAt: progress.completedAt ?? null,
    lastSeenAt: progress.lastSeenAt ?? null,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
  };
}

function toDomainLearningContentKind(
  kind: LearningCourseRecord['sections'][number]['lessons'][number]['kind'],
): LearningContentKind {
  switch (kind) {
    case 'TEXT':
      return LearningContentKind.TEXT;
    case 'VIDEO':
      return LearningContentKind.VIDEO;
    case 'EMBED':
      return LearningContentKind.EMBED;
    case 'FILE':
      return LearningContentKind.FILE;
    case 'LIVE_SESSION':
      return LearningContentKind.LIVE_SESSION;
    case 'EXTERNAL_LINK':
      return LearningContentKind.EXTERNAL_LINK;
  }

  return assertNever(kind);
}

function toDomainLearningCourseStatus(
  status: LearningCourseRecord['status'],
): LearningCourseStatus {
  switch (status) {
    case 'DRAFT':
      return LearningCourseStatus.DRAFT;
    case 'PUBLISHED':
      return LearningCourseStatus.PUBLISHED;
    case 'ARCHIVED':
      return LearningCourseStatus.ARCHIVED;
  }
}

function toDomainLearningVisibility(
  visibility: LearningCourseRecord['visibility'],
): LearningVisibility {
  switch (visibility) {
    case 'PRIVATE':
      return LearningVisibility.PRIVATE;
    case 'WORKSPACE':
      return LearningVisibility.WORKSPACE;
    case 'PUBLIC':
      return LearningVisibility.PUBLIC;
    case 'UNLISTED':
      return LearningVisibility.UNLISTED;
  }

  return assertNever(visibility);
}

function toDomainEnrollmentStatus(status: LearningEnrollmentRecord['status']): EnrollmentStatus {
  switch (status) {
    case 'ACTIVE':
      return EnrollmentStatus.ACTIVE;
    case 'COMPLETED':
      return EnrollmentStatus.COMPLETED;
    case 'CANCELLED':
      return EnrollmentStatus.CANCELLED;
  }

  return assertNever(status);
}

function toDomainLearningProgressStatus(
  status: LearningProgressRecord['status'],
): LearningProgressStatus {
  switch (status) {
    case 'NOT_STARTED':
      return LearningProgressStatus.NOT_STARTED;
    case 'IN_PROGRESS':
      return LearningProgressStatus.IN_PROGRESS;
    case 'COMPLETED':
      return LearningProgressStatus.COMPLETED;
  }

  return assertNever(status);
}

function assertNever(value: never): never {
  throw new Error(`unexpected learning prisma enum value: ${String(value)}`);
}
