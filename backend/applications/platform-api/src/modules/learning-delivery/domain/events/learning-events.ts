import { LearningDomainEvent } from './learning-domain-event.js';

export type LearningEventContext = {
  tenantId: string;
  workspaceId: string;
};

export type CourseCreatedPayload = {
  courseId: string;
  title: string;
  creatorPrincipalId: string;
};

export function courseCreated(
  input: LearningEventContext & CourseCreatedPayload,
): LearningDomainEvent<CourseCreatedPayload> {
  return {
    eventName: 'learning.course.created',
    eventVersion: 1,
    occurredAt: new Date(),
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    aggregateId: input.courseId,
    payload: {
      courseId: input.courseId,
      title: input.title,
      creatorPrincipalId: input.creatorPrincipalId,
    },
  };
}

export function coursePublished(
  input: LearningEventContext & { courseId: string },
): LearningDomainEvent<{ courseId: string }> {
  return {
    eventName: 'learning.course.published',
    eventVersion: 1,
    occurredAt: new Date(),
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    aggregateId: input.courseId,
    payload: { courseId: input.courseId },
  };
}

export function courseArchived(
  input: LearningEventContext & { courseId: string },
): LearningDomainEvent<{ courseId: string }> {
  return {
    eventName: 'learning.course.archived',
    eventVersion: 1,
    occurredAt: new Date(),
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    aggregateId: input.courseId,
    payload: { courseId: input.courseId },
  };
}

export function enrollmentCreated(
  input: LearningEventContext & { enrollmentId: string },
): LearningDomainEvent<{ enrollmentId: string }> {
  return {
    eventName: 'learning.enrollment.created',
    eventVersion: 1,
    occurredAt: new Date(),
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    aggregateId: input.enrollmentId,
    payload: { enrollmentId: input.enrollmentId },
  };
}

export function enrollmentCompleted(
  input: LearningEventContext & { enrollmentId: string },
): LearningDomainEvent<{ enrollmentId: string }> {
  return {
    eventName: 'learning.enrollment.completed',
    eventVersion: 1,
    occurredAt: new Date(),
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    aggregateId: input.enrollmentId,
    payload: { enrollmentId: input.enrollmentId },
  };
}

export function progressCompleted(
  input: LearningEventContext & { progressId: string },
): LearningDomainEvent<{ progressId: string }> {
  return {
    eventName: 'learning.progress.completed',
    eventVersion: 1,
    occurredAt: new Date(),
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    aggregateId: input.progressId,
    payload: { progressId: input.progressId },
  };
}
