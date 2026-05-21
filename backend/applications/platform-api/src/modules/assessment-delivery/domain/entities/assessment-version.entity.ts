/**
 * AssessmentVersion Entity
 * Represents a versioned snapshot of assessment content
 */

import {
  AssessmentVersionStatus,
  assertValidAssessmentVersionStatus,
  AssessmentVersionStatusEnum,
} from '../value-objects/index.js';
import { AssessmentQuestion } from './assessment-question.entity.js';
import { AssessmentSection } from './assessment-section.entity.js';

export interface AssessmentVersionProps {
  id: string;
  assessmentId: string;
  versionNumber: number;
  status: AssessmentVersionStatus;
  sections: AssessmentSection[];
  looseQuestions: AssessmentQuestion[];
  createdByPrincipalId: string;
  createdAt: Date;
  publishedAt?: Date;
  supersededAt?: Date;
}

export class AssessmentVersion {
  readonly id: string;
  readonly assessmentId: string;
  readonly versionNumber: number;
  status: AssessmentVersionStatus;
  sections: AssessmentSection[];
  looseQuestions: AssessmentQuestion[];
  readonly createdByPrincipalId: string;
  readonly createdAt: Date;
  publishedAt?: Date;
  supersededAt?: Date;

  private constructor(props: AssessmentVersionProps) {
    this.id = props.id;
    this.assessmentId = props.assessmentId;
    this.versionNumber = props.versionNumber;
    this.status = props.status;
    this.sections = props.sections;
    this.looseQuestions = props.looseQuestions;
    this.createdByPrincipalId = props.createdByPrincipalId;
    this.createdAt = props.createdAt;
    if (props.publishedAt !== undefined) {
      this.publishedAt = props.publishedAt;
    }
    if (props.supersededAt !== undefined) {
      this.supersededAt = props.supersededAt;
    }
  }

  /**
   * Create a new draft version
   */
  static createDraft(
    props: Omit<AssessmentVersionProps, 'status' | 'publishedAt' | 'supersededAt'>,
  ): AssessmentVersion {
    AssessmentVersion.validateProps({
      ...props,
      status: AssessmentVersionStatusEnum.DRAFT,
    });

    return new AssessmentVersion({
      ...props,
      status: AssessmentVersionStatusEnum.DRAFT,
    });
  }

  /**
   * Restore a version from persistence
   */
  static restore(props: AssessmentVersionProps): AssessmentVersion {
    AssessmentVersion.validateProps(props);
    return new AssessmentVersion(props);
  }

  /**
   * Validate version properties
   */
  private static validateProps(props: AssessmentVersionProps): void {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('Version id is required');
    }

    if (!props.assessmentId || typeof props.assessmentId !== 'string') {
      throw new Error('Version assessmentId is required');
    }

    if (!Number.isInteger(props.versionNumber) || props.versionNumber < 1) {
      throw new Error('Version number must be >= 1');
    }

    assertValidAssessmentVersionStatus(props.status);

    if (!Array.isArray(props.sections)) {
      throw new Error('Sections must be an array');
    }

    if (!Array.isArray(props.looseQuestions)) {
      throw new Error('Loose questions must be an array');
    }

    if (!props.createdByPrincipalId || typeof props.createdByPrincipalId !== 'string') {
      throw new Error('createdByPrincipalId is required');
    }
  }

  /**
   * Replace content (sections and loose questions)
   * Only draft versions can have their content replaced
   */
  replaceContent(sections: AssessmentSection[], looseQuestions: AssessmentQuestion[]): void {
    if (this.status !== AssessmentVersionStatusEnum.DRAFT) {
      throw new Error('Only draft versions can have their content replaced');
    }

    if (!Array.isArray(sections)) {
      throw new Error('Sections must be an array');
    }

    if (!Array.isArray(looseQuestions)) {
      throw new Error('Loose questions must be an array');
    }

    this.sections = sections;
    this.looseQuestions = looseQuestions;
  }

  /**
   * Publish this draft version (create a snapshot)
   * Returns the published status but actual snapshot creation is handled by Assessment
   */
  publishSnapshot(): void {
    if (this.status !== AssessmentVersionStatusEnum.DRAFT) {
      throw new Error('Only draft versions can be published');
    }

    this.status = AssessmentVersionStatusEnum.PUBLISHED_SNAPSHOT;
    this.publishedAt = new Date();
  }

  /**
   * Mark this published snapshot as superseded
   * Only published snapshots can be superseded
   */
  markSuperseded(): void {
    if (this.status !== AssessmentVersionStatusEnum.PUBLISHED_SNAPSHOT) {
      throw new Error('Only published snapshots can be marked as superseded');
    }

    this.status = AssessmentVersionStatusEnum.SUPERSEDED;
    this.supersededAt = new Date();
  }

  /**
   * Get all questions (sections + loose)
   */
  getAllQuestions(): AssessmentQuestion[] {
    const sectionsQuestions = this.sections.flatMap((s) => s.questions);
    return [...sectionsQuestions, ...this.looseQuestions];
  }

  /**
   * Get total question count
   */
  getQuestionCount(): number {
    return this.getAllQuestions().length;
  }

  /**
   * Check if version is published
   */
  isPublished(): boolean {
    return this.status === AssessmentVersionStatusEnum.PUBLISHED_SNAPSHOT;
  }

  /**
   * Check if version is draft
   */
  isDraft(): boolean {
    return this.status === AssessmentVersionStatusEnum.DRAFT;
  }

  /**
   * Check if version is superseded
   */
  isSuperseded(): boolean {
    return this.status === AssessmentVersionStatusEnum.SUPERSEDED;
  }

  /**
   * Convert to plain object
   */
  toObject(): AssessmentVersionProps {
    return {
      id: this.id,
      assessmentId: this.assessmentId,
      versionNumber: this.versionNumber,
      status: this.status,
      sections: this.sections.map((s) => s.toObject() as AssessmentSection),
      looseQuestions: this.looseQuestions.map((q) => q.toObject() as AssessmentQuestion),
      createdByPrincipalId: this.createdByPrincipalId,
      createdAt: this.createdAt,
      ...(this.publishedAt && { publishedAt: this.publishedAt }),
      ...(this.supersededAt && { supersededAt: this.supersededAt }),
    };
  }
}
