/**
 * Assessment Aggregate Root
 * Represents an assessment/exam/quiz in the system
 * Orchestrates versions, snapshots, questions, and grading configuration
 */

import {
  AssessmentPurpose,
  AssessmentStatus,
  AssessmentStatusEnum,
  AssessmentVisibility,
  AssessmentVisibilityEnum,
  AttemptPolicy,
  TimeLimit,
  ResultReleasePolicy,
  ResultReleasePolicyEnum,
  assertValidAssessmentPurpose,
  assertValidAssessmentStatus,
  assertValidAssessmentVisibility,
  assertValidResultReleasePolicy,
} from '../value-objects/index.js';
import { AssessmentVersion } from './assessment-version.entity.js';
import { AssessmentPublishedSnapshot } from './assessment-published-snapshot.entity.js';
import { GradingRubric } from './grading-rubric.entity.js';
import { GradingRule } from './grading-rule.entity.js';

export interface AssessmentProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  ownerPrincipalId: string;
  purpose: AssessmentPurpose;
  status: AssessmentStatus;
  visibility: AssessmentVisibility;
  title: string;
  description?: string;
  currentDraftVersion?: AssessmentVersion;
  publishedSnapshot?: AssessmentPublishedSnapshot;
  gradingRubrics?: GradingRubric[];
  gradingRules?: GradingRule[];
  attemptPolicy: AttemptPolicy;
  timeLimit: TimeLimit;
  resultReleasePolicy: ResultReleasePolicy;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  metadata: Record<string, unknown>;
}

export class Assessment {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly ownerPrincipalId: string;
  purpose: AssessmentPurpose;
  status: AssessmentStatus;
  visibility: AssessmentVisibility;
  title: string;
  description?: string;
  currentDraftVersion?: AssessmentVersion;
  publishedSnapshot?: AssessmentPublishedSnapshot;
  gradingRubrics: GradingRubric[];
  gradingRules: GradingRule[];
  attemptPolicy: AttemptPolicy;
  timeLimit: TimeLimit;
  resultReleasePolicy: ResultReleasePolicy;
  readonly createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  metadata: Record<string, unknown>;

  private constructor(props: AssessmentProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.workspaceId = props.workspaceId;
    this.ownerPrincipalId = props.ownerPrincipalId;
    this.purpose = props.purpose;
    this.status = props.status;
    this.visibility = props.visibility;
    this.title = props.title;
    if (props.description !== undefined) {
      this.description = props.description;
    }
    if (props.currentDraftVersion !== undefined) {
      this.currentDraftVersion = props.currentDraftVersion;
    }
    if (props.publishedSnapshot !== undefined) {
      this.publishedSnapshot = props.publishedSnapshot;
    }
    this.gradingRubrics = props.gradingRubrics ?? [];
    this.gradingRules = props.gradingRules ?? [];
    this.attemptPolicy = props.attemptPolicy;
    this.timeLimit = props.timeLimit;
    this.resultReleasePolicy = props.resultReleasePolicy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    if (props.publishedAt !== undefined) {
      this.publishedAt = props.publishedAt;
    }
    if (props.archivedAt !== undefined) {
      this.archivedAt = props.archivedAt;
    }
    this.metadata = props.metadata;
  }

  /**
   * Create a new draft assessment
   */
  static createDraft(
    props: Omit<
      AssessmentProps,
      'status' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'archivedAt'
    >,
  ): Assessment {
    const now = new Date();
    const fullProps: AssessmentProps = {
      ...props,
      visibility: props.visibility ?? AssessmentVisibilityEnum.WORKSPACE,
      attemptPolicy:
        props.attemptPolicy ??
        AttemptPolicy.create({
          allowRetake: false,
          shuffleQuestions: false,
          shuffleOptions: false,
        }),
      timeLimit: props.timeLimit ?? TimeLimit.untimed(),
      resultReleasePolicy: props.resultReleasePolicy ?? ResultReleasePolicyEnum.IMMEDIATE,
      status: AssessmentStatusEnum.DRAFT,
      createdAt: now,
      updatedAt: now,
      gradingRubrics: props.gradingRubrics ?? [],
      gradingRules: props.gradingRules ?? [],
      metadata: props.metadata ?? {},
    };

    Assessment.validateProps(fullProps);

    return new Assessment(fullProps);
  }

  /**
   * Restore an assessment from persistence
   */
  static restore(props: AssessmentProps): Assessment {
    Assessment.validateProps(props);
    return new Assessment(props);
  }

  /**
   * Validate assessment properties
   */
  private static validateProps(props: AssessmentProps): void {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('Assessment id is required');
    }

    if (!props.tenantId || typeof props.tenantId !== 'string') {
      throw new Error('Assessment tenantId is required');
    }

    if (!props.workspaceId || typeof props.workspaceId !== 'string') {
      throw new Error('Assessment workspaceId is required');
    }

    if (!props.ownerPrincipalId || typeof props.ownerPrincipalId !== 'string') {
      throw new Error('Assessment ownerPrincipalId is required');
    }

    if (!props.title || typeof props.title !== 'string') {
      throw new Error('Assessment title is required');
    }

    if (props.description !== undefined && typeof props.description !== 'string') {
      throw new Error('Assessment description must be a string');
    }

    assertValidAssessmentPurpose(props.purpose);
    assertValidAssessmentStatus(props.status);
    assertValidAssessmentVisibility(props.visibility);
    assertValidResultReleasePolicy(props.resultReleasePolicy);

    if (typeof props.metadata !== 'object' || props.metadata === null) {
      throw new Error('Metadata must be an object');
    }

    if (props.gradingRubrics !== undefined && !Array.isArray(props.gradingRubrics)) {
      throw new Error('gradingRubrics must be an array');
    }

    if (props.gradingRules !== undefined && !Array.isArray(props.gradingRules)) {
      throw new Error('gradingRules must be an array');
    }
  }

  /**
   * Rename the assessment
   */
  rename(newTitle: string): void {
    if (!newTitle || typeof newTitle !== 'string') {
      throw new Error('Title must be a non-empty string');
    }

    this.title = newTitle;
    this.updatedAt = new Date();
  }

  /**
   * Update description (safely handle clearing)
   */
  updateDescription(newDescription?: string): void {
    if (newDescription !== undefined && typeof newDescription !== 'string') {
      throw new Error('Description must be a string');
    }

    if (newDescription === undefined) {
      delete this.description;
    } else {
      this.description = newDescription;
    }
    this.updatedAt = new Date();
  }

  /**
   * Update visibility
   */
  updateVisibility(newVisibility: AssessmentVisibility): void {
    this.visibility = assertValidAssessmentVisibility(newVisibility);
    this.updatedAt = new Date();
  }

  /**
   * Update attempt policy
   */
  updateAttemptPolicy(newPolicy: AttemptPolicy): void {
    this.attemptPolicy = newPolicy;
    this.updatedAt = new Date();
  }

  /**
   * Update time limit
   */
  updateTimeLimit(newTimeLimit: TimeLimit): void {
    this.timeLimit = newTimeLimit;
    this.updatedAt = new Date();
  }

  /**
   * Update result release policy
   */
  updateResultReleasePolicy(newPolicy: ResultReleasePolicy): void {
    this.resultReleasePolicy = assertValidResultReleasePolicy(newPolicy);
    this.updatedAt = new Date();
  }

  /**
   * Replace draft content (update sections and questions in current draft version)
   * This is the main authoring method for draft content
   */
  replaceDraftContent(newVersion: AssessmentVersion): void {
    if (this.status !== AssessmentStatusEnum.DRAFT) {
      throw new Error('Only draft assessments can have their content replaced');
    }

    if (!newVersion.isDraft()) {
      throw new Error('Replacement version must be draft');
    }

    if (newVersion.assessmentId !== this.id) {
      throw new Error('Version must belong to this assessment');
    }

    this.currentDraftVersion = newVersion;
    this.updatedAt = new Date();
  }

  /**
   * Publish the draft assessment
   * Transitions to PUBLISHED status and creates a published snapshot
   */
  publish(publishedByPrincipalId: string, snapshotId: string, snapshotCreatedAt: Date): void {
    if (this.status === AssessmentStatusEnum.ARCHIVED) {
      throw new Error('Archived assessment cannot be published');
    }

    if (this.status === AssessmentStatusEnum.PUBLISHED) {
      throw new Error(
        'Assessment is already published. Create a new draft version to make changes.',
      );
    }

    if (!this.currentDraftVersion) {
      throw new Error('Cannot publish without a draft version');
    }

    if (!this.currentDraftVersion.isDraft()) {
      throw new Error('Draft version must be in DRAFT status');
    }

    if (this.currentDraftVersion.getQuestionCount() === 0) {
      throw new Error('Cannot publish empty assessment');
    }

    // Mark draft version as published
    this.currentDraftVersion.publishSnapshot();

    // Create the published snapshot
    this.publishedSnapshot = AssessmentPublishedSnapshot.createFromVersion(
      this.currentDraftVersion,
      {
        id: snapshotId,
        assessmentId: this.id,
        publishedByPrincipalId,
        createdAt: snapshotCreatedAt,
      },
    );

    this.status = AssessmentStatusEnum.PUBLISHED;
    this.publishedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Archive the assessment
   * Can be archived from any status except already archived
   */
  archive(): void {
    if (this.status === AssessmentStatusEnum.ARCHIVED) {
      throw new Error('Assessment is already archived');
    }

    this.status = AssessmentStatusEnum.ARCHIVED;
    this.archivedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Restore archived assessment to draft status
   * Clears the archived timestamp and sets status back to DRAFT
   */
  restoreToDraft(): void {
    if (this.status !== AssessmentStatusEnum.ARCHIVED) {
      throw new Error('Only archived assessments can be restored');
    }

    this.status = AssessmentStatusEnum.DRAFT;
    delete this.archivedAt;
    this.updatedAt = new Date();
  }

  /**
   * Update metadata
   */
  updateMetadata(updates: Record<string, unknown>): void {
    if (typeof updates !== 'object' || updates === null) {
      throw new Error('Metadata updates must be an object');
    }

    this.metadata = { ...this.metadata, ...updates };
    this.updatedAt = new Date();
  }

  /**
   * Check if assessment is in draft status
   */
  isDraft(): boolean {
    return this.status === AssessmentStatusEnum.DRAFT;
  }

  /**
   * Check if assessment is published
   */
  isPublished(): boolean {
    return this.status === AssessmentStatusEnum.PUBLISHED;
  }

  /**
   * Check if assessment is archived
   */
  isArchived(): boolean {
    return this.status === AssessmentStatusEnum.ARCHIVED;
  }

  /**
   * Get all questions from current draft version
   */
  getDraftQuestions() {
    return this.currentDraftVersion?.getAllQuestions() ?? [];
  }

  /**
   * Get all questions from published snapshot
   */
  getPublishedQuestions() {
    return this.publishedSnapshot?.getAllQuestions() ?? [];
  }

  replaceGradingConfiguration(rubrics: GradingRubric[], rules: GradingRule[]): void {
    if (!Array.isArray(rubrics) || !Array.isArray(rules)) {
      throw new Error('Rubrics and rules must be arrays');
    }

    this.gradingRubrics = rubrics;
    this.gradingRules = rules;
    this.updatedAt = new Date();
  }

  /**
   * Convert to plain object
   */
  toObject(): AssessmentProps {
    return {
      id: this.id,
      tenantId: this.tenantId,
      workspaceId: this.workspaceId,
      ownerPrincipalId: this.ownerPrincipalId,
      purpose: this.purpose,
      status: this.status,
      visibility: this.visibility,
      title: this.title,
      ...(this.description && { description: this.description }),
      ...(this.currentDraftVersion && { currentDraftVersion: this.currentDraftVersion }),
      ...(this.publishedSnapshot && { publishedSnapshot: this.publishedSnapshot }),
      gradingRubrics: this.gradingRubrics,
      gradingRules: this.gradingRules,
      attemptPolicy: this.attemptPolicy,
      timeLimit: this.timeLimit,
      resultReleasePolicy: this.resultReleasePolicy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      ...(this.publishedAt && { publishedAt: this.publishedAt }),
      ...(this.archivedAt && { archivedAt: this.archivedAt }),
      metadata: this.metadata,
    };
  }
}
