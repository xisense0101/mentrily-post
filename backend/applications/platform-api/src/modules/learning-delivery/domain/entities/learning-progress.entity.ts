import { LearningProgressStatus } from '../value-objects/learning-progress-status.vo.js';

export interface LearningProgressProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  courseId: string;
  enrollmentId: string;
  lessonId: string;
  learnerPrincipalId: string;
  status: LearningProgressStatus;
  startedAt?: Date;
  completedAt?: Date;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningProgress implements LearningProgressProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  courseId: string;
  enrollmentId: string;
  lessonId: string;
  learnerPrincipalId: string;
  status: LearningProgressStatus;
  startedAt?: Date;
  completedAt?: Date;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: LearningProgressProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.workspaceId = props.workspaceId;
    this.courseId = props.courseId;
    this.enrollmentId = props.enrollmentId;
    this.lessonId = props.lessonId;
    this.learnerPrincipalId = props.learnerPrincipalId;
    this.status = props.status;
    if (props.startedAt !== undefined) {
      this.startedAt = props.startedAt;
    }
    if (props.completedAt !== undefined) {
      this.completedAt = props.completedAt;
    }
    if (props.lastSeenAt !== undefined) {
      this.lastSeenAt = props.lastSeenAt;
    }
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static createNotStarted(
    input: Omit<LearningProgressProps, 'status' | 'createdAt' | 'updatedAt'>,
  ) {
    const now = new Date();
    return new LearningProgress({
      ...input,
      status: LearningProgressStatus.NOT_STARTED,
      createdAt: now,
      updatedAt: now,
    });
  }

  markStarted() {
    if (this.startedAt) return;
    this.startedAt = new Date();
    this.status = LearningProgressStatus.IN_PROGRESS;
    this.updatedAt = new Date();
  }

  markSeen() {
    const now = new Date();
    this.lastSeenAt = now;
    if (this.status === LearningProgressStatus.NOT_STARTED) {
      this.status = LearningProgressStatus.IN_PROGRESS;
      this.startedAt = this.startedAt ?? now;
    }
    this.updatedAt = new Date();
  }

  markCompleted() {
    if (this.status === LearningProgressStatus.COMPLETED)
      throw new Error('progress already completed');
    this.completedAt = new Date();
    this.status = LearningProgressStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  reset() {
    this.status = LearningProgressStatus.NOT_STARTED;
    delete this.startedAt;
    delete this.completedAt;
    delete this.lastSeenAt;
    this.updatedAt = new Date();
  }
}
