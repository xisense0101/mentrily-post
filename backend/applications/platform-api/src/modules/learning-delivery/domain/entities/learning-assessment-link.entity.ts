export type LearningAssessmentLinkScope = 'COURSE' | 'LESSON';
export type LearningAssessmentUnlockPolicy = 'IMMEDIATE' | 'AFTER_LESSON_COMPLETE';

export interface LearningAssessmentLinkProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  courseId: string;
  sectionId?: string;
  lessonId?: string;
  assessmentId: string;
  required: boolean;
  position: number;
  unlockPolicy: LearningAssessmentUnlockPolicy;
  minimumScore?: number;
  createdByPrincipalId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningAssessmentLink implements LearningAssessmentLinkProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  courseId: string;
  sectionId?: string;
  lessonId?: string;
  assessmentId: string;
  required: boolean;
  position: number;
  unlockPolicy: LearningAssessmentUnlockPolicy;
  minimumScore?: number;
  createdByPrincipalId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: LearningAssessmentLinkProps) {
    if (!props.id) throw new Error('id is required');
    if (!props.tenantId) throw new Error('tenantId is required');
    if (!props.workspaceId) throw new Error('workspaceId is required');
    if (!props.courseId) throw new Error('courseId is required');
    if (!props.assessmentId) throw new Error('assessmentId is required');
    if (!props.createdByPrincipalId) throw new Error('createdByPrincipalId is required');
    if (!Number.isInteger(props.position) || props.position < 0) {
      throw new Error('position must be a non-negative integer');
    }

    this.id = props.id;
    this.tenantId = props.tenantId;
    this.workspaceId = props.workspaceId;
    this.courseId = props.courseId;
    if (props.sectionId !== undefined) this.sectionId = props.sectionId;
    if (props.lessonId !== undefined) this.lessonId = props.lessonId;
    this.assessmentId = props.assessmentId;
    this.required = props.required;
    this.position = props.position;
    this.unlockPolicy = props.unlockPolicy;
    if (props.minimumScore !== undefined) this.minimumScore = props.minimumScore;
    this.createdByPrincipalId = props.createdByPrincipalId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static createDraft(input: Omit<LearningAssessmentLinkProps, 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    return new LearningAssessmentLink({
      ...input,
      createdAt: now,
      updatedAt: now,
    });
  }

  scope(): LearningAssessmentLinkScope {
    return this.lessonId ? 'LESSON' : 'COURSE';
  }

  updateRequired(required: boolean): void {
    this.required = required;
    this.updatedAt = new Date();
  }

  updatePosition(position: number): void {
    if (!Number.isInteger(position) || position < 0) {
      throw new Error('position must be a non-negative integer');
    }
    this.position = position;
    this.updatedAt = new Date();
  }

  updateMinimumScore(minimumScore?: number): void {
    if (minimumScore !== undefined && minimumScore < 0) {
      throw new Error('minimumScore must be non-negative');
    }
    if (minimumScore === undefined) {
      delete this.minimumScore;
    } else {
      this.minimumScore = minimumScore;
    }
    this.updatedAt = new Date();
  }

  updateUnlockPolicy(unlockPolicy: LearningAssessmentUnlockPolicy): void {
    this.unlockPolicy = unlockPolicy;
    this.updatedAt = new Date();
  }
}
