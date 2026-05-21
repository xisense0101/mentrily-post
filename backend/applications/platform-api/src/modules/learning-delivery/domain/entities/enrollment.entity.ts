import { EnrollmentStatus } from '../value-objects/enrollment-status.vo.js';

export interface EnrollmentProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  courseId: string;
  learnerPrincipalId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Enrollment implements EnrollmentProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  courseId: string;
  learnerPrincipalId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: EnrollmentProps) {
    if (!props.tenantId) throw new Error('tenantId required');
    if (!props.workspaceId) throw new Error('workspaceId required');
    if (!props.courseId) throw new Error('courseId required');
    if (!props.learnerPrincipalId) throw new Error('learnerPrincipalId required');
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.workspaceId = props.workspaceId;
    this.courseId = props.courseId;
    this.learnerPrincipalId = props.learnerPrincipalId;
    this.status = props.status;
    this.enrolledAt = props.enrolledAt;
    if (props.startedAt !== undefined) {
      this.startedAt = props.startedAt;
    }
    if (props.completedAt !== undefined) {
      this.completedAt = props.completedAt;
    }
    if (props.cancelledAt !== undefined) {
      this.cancelledAt = props.cancelledAt;
    }
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: Omit<EnrollmentProps, 'status' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    return new Enrollment({
      ...props,
      status: EnrollmentStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  start() {
    if (this.startedAt) return; // only set once
    this.startedAt = new Date();
    this.updatedAt = new Date();
    this.status = EnrollmentStatus.ACTIVE;
  }

  complete() {
    if (this.status === EnrollmentStatus.COMPLETED) throw new Error('enrollment already completed');
    if (this.status === EnrollmentStatus.CANCELLED)
      throw new Error('cancelled enrollment cannot be completed');
    this.completedAt = new Date();
    this.status = EnrollmentStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  cancel() {
    if (this.status === EnrollmentStatus.COMPLETED) {
      throw new Error('completed enrollment cannot be cancelled');
    }
    if (this.status === EnrollmentStatus.CANCELLED) return;
    this.cancelledAt = new Date();
    this.status = EnrollmentStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  reactivate() {
    if (this.status !== EnrollmentStatus.CANCELLED) return;
    delete this.cancelledAt;
    this.status = EnrollmentStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  naturalKey(): string {
    return `${this.workspaceId}:${this.courseId}:${this.learnerPrincipalId}`;
  }
}
