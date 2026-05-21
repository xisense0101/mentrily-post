/**
 * AssessmentPublishedSnapshot Entity
 * Represents an immutable snapshot of a published assessment version
 * This is what learners will attempt
 */

import { AssessmentQuestion } from './assessment-question.entity.js';
import { AssessmentSection } from './assessment-section.entity.js';
import { AssessmentVersion } from './assessment-version.entity.js';
import { AssessmentVersionStatusEnum } from '../value-objects/index.js';

export interface AssessmentPublishedSnapshotProps {
  id: string;
  assessmentId: string;
  versionId: string;
  versionNumber: number;
  sections: AssessmentSection[];
  looseQuestions: AssessmentQuestion[];
  publishedByPrincipalId: string;
  publishedAt: Date;
  createdAt: Date;
}

export class AssessmentPublishedSnapshot {
  readonly id: string;
  readonly assessmentId: string;
  readonly versionId: string;
  readonly versionNumber: number;
  readonly sections: AssessmentSection[];
  readonly looseQuestions: AssessmentQuestion[];
  readonly publishedByPrincipalId: string;
  readonly publishedAt: Date;
  readonly createdAt: Date;

  private constructor(props: AssessmentPublishedSnapshotProps) {
    this.id = props.id;
    this.assessmentId = props.assessmentId;
    this.versionId = props.versionId;
    this.versionNumber = props.versionNumber;
    this.sections = props.sections;
    this.looseQuestions = props.looseQuestions;
    this.publishedByPrincipalId = props.publishedByPrincipalId;
    this.publishedAt = props.publishedAt;
    this.createdAt = props.createdAt;
  }

  /**
   * Create a published snapshot from a published version
   * @throws Error if version is not in PUBLISHED_SNAPSHOT status
   */
  static createFromVersion(
    version: AssessmentVersion,
    props: Omit<
      AssessmentPublishedSnapshotProps,
      'versionId' | 'versionNumber' | 'sections' | 'looseQuestions' | 'publishedAt'
    >,
  ): AssessmentPublishedSnapshot {
    if (version.status !== AssessmentVersionStatusEnum.PUBLISHED_SNAPSHOT) {
      throw new Error('Source version must be in PUBLISHED_SNAPSHOT status');
    }

    if (!version.publishedAt) {
      throw new Error('Source version must have publishedAt timestamp');
    }

    AssessmentPublishedSnapshot.validateProps({
      ...props,
      versionId: version.id,
      versionNumber: version.versionNumber,
      sections: version.sections,
      looseQuestions: version.looseQuestions,
      publishedAt: version.publishedAt,
    });

    return new AssessmentPublishedSnapshot({
      ...props,
      versionId: version.id,
      versionNumber: version.versionNumber,
      sections: version.sections,
      looseQuestions: version.looseQuestions,
      publishedAt: version.publishedAt,
    });
  }

  /**
   * Restore a snapshot from persistence
   */
  static restore(props: AssessmentPublishedSnapshotProps): AssessmentPublishedSnapshot {
    AssessmentPublishedSnapshot.validateProps(props);
    return new AssessmentPublishedSnapshot(props);
  }

  /**
   * Validate snapshot properties
   */
  private static validateProps(props: AssessmentPublishedSnapshotProps): void {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('Snapshot id is required');
    }

    if (!props.assessmentId || typeof props.assessmentId !== 'string') {
      throw new Error('Snapshot assessmentId is required');
    }

    if (!props.versionId || typeof props.versionId !== 'string') {
      throw new Error('Snapshot versionId is required');
    }

    if (!Number.isInteger(props.versionNumber) || props.versionNumber < 1) {
      throw new Error('Version number must be >= 1');
    }

    if (!Array.isArray(props.sections)) {
      throw new Error('Sections must be an array');
    }

    if (!Array.isArray(props.looseQuestions)) {
      throw new Error('Loose questions must be an array');
    }

    if (!props.publishedByPrincipalId || typeof props.publishedByPrincipalId !== 'string') {
      throw new Error('publishedByPrincipalId is required');
    }

    if (!(props.publishedAt instanceof Date)) {
      throw new Error('publishedAt must be a Date');
    }

    if (!(props.createdAt instanceof Date)) {
      throw new Error('createdAt must be a Date');
    }
  }

  /**
   * Get all questions in deterministic order
   * Sections first (in order), then loose questions
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
   * Get total points across all questions
   */
  getTotalPoints(): number {
    return this.getAllQuestions().reduce((sum, q) => sum + q.points.value(), 0);
  }

  /**
   * Snapshot is immutable - can be read but not modified
   */
  readonly isImmutable: boolean = true;

  /**
   * Convert to plain object
   */
  toObject(): AssessmentPublishedSnapshotProps {
    return {
      id: this.id,
      assessmentId: this.assessmentId,
      versionId: this.versionId,
      versionNumber: this.versionNumber,
      sections: this.sections.map((s) => s.toObject() as AssessmentSection),
      looseQuestions: this.looseQuestions.map((q) => q.toObject() as AssessmentQuestion),
      publishedByPrincipalId: this.publishedByPrincipalId,
      publishedAt: this.publishedAt,
      createdAt: this.createdAt,
    };
  }
}
