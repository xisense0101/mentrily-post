import type { AssessmentExecutionLanguage } from '../value-objects/assessment-execution-language.vo.js';
import type { AssessmentExecutionKind } from '../value-objects/assessment-execution-kind.vo.js';
import type { AssessmentExecutionStatus } from '../value-objects/assessment-execution-status.vo.js';
import { AssessmentExecutionStatusEnum } from '../value-objects/assessment-execution-status.vo.js';
import { assertValidAssessmentExecutionKind } from '../value-objects/assessment-execution-kind.vo.js';
import { assertValidAssessmentExecutionLanguage } from '../value-objects/assessment-execution-language.vo.js';
import { AssessmentExecutionResourceLimits } from '../value-objects/assessment-execution-resource-limits.vo.js';

export interface AssessmentExecutionRequestProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  attemptId: string;
  answerId: string;
  questionId: string;
  kind: AssessmentExecutionKind;
  language?: AssessmentExecutionLanguage;
  source?: string;
  notebookJson?: Record<string, unknown>;
  resourceLimits: AssessmentExecutionResourceLimits;
  status: AssessmentExecutionStatus;
  requestedByPrincipalId: string;
  requestedAt: Date;
  metadata: Record<string, unknown>;
}

export class AssessmentExecutionRequest {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly attemptId: string;
  readonly answerId: string;
  readonly questionId: string;
  readonly kind: AssessmentExecutionKind;
  readonly language?: AssessmentExecutionLanguage;
  readonly source?: string;
  readonly notebookJson?: Record<string, unknown>;
  readonly resourceLimits: AssessmentExecutionResourceLimits;
  status: AssessmentExecutionStatus;
  readonly requestedByPrincipalId: string;
  readonly requestedAt: Date;
  metadata: Record<string, unknown>;

  private constructor(props: AssessmentExecutionRequestProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.workspaceId = props.workspaceId;
    this.attemptId = props.attemptId;
    this.answerId = props.answerId;
    this.questionId = props.questionId;
    this.kind = props.kind;
    if (props.language !== undefined) {
      this.language = props.language;
    }
    if (props.source !== undefined) {
      this.source = props.source;
    }
    if (props.notebookJson !== undefined) {
      this.notebookJson = { ...props.notebookJson };
    }
    this.resourceLimits = props.resourceLimits;
    this.status = props.status;
    this.requestedByPrincipalId = props.requestedByPrincipalId;
    this.requestedAt = props.requestedAt;
    this.metadata = { ...props.metadata };
  }

  static createReserved(props: {
    id: string;
    tenantId: string;
    workspaceId: string;
    attemptId: string;
    answerId: string;
    questionId: string;
    kind: AssessmentExecutionKind;
    language?: AssessmentExecutionLanguage;
    source?: string;
    notebookJson?: Record<string, unknown>;
    resourceLimits: AssessmentExecutionResourceLimits;
    requestedByPrincipalId: string;
    requestedAt?: Date;
    metadata?: Record<string, unknown>;
  }): AssessmentExecutionRequest {
    if (!props.id) {
      throw new Error('AssessmentExecutionRequest id is required');
    }
    if (!props.tenantId) {
      throw new Error('AssessmentExecutionRequest tenantId is required');
    }
    if (!props.workspaceId) {
      throw new Error('AssessmentExecutionRequest workspaceId is required');
    }
    if (!props.attemptId) {
      throw new Error('AssessmentExecutionRequest attemptId is required');
    }
    if (!props.answerId) {
      throw new Error('AssessmentExecutionRequest answerId is required');
    }
    if (!props.questionId) {
      throw new Error('AssessmentExecutionRequest questionId is required');
    }
    if (!props.requestedByPrincipalId) {
      throw new Error('AssessmentExecutionRequest requestedByPrincipalId is required');
    }
    const kind = assertValidAssessmentExecutionKind(props.kind);
    const language =
      props.language !== undefined
        ? assertValidAssessmentExecutionLanguage(props.language)
        : undefined;
    if (!(props.resourceLimits instanceof AssessmentExecutionResourceLimits)) {
      throw new Error('AssessmentExecutionRequest resourceLimits is required');
    }
    const now = props.requestedAt ?? new Date();
    return new AssessmentExecutionRequest({
      id: props.id,
      tenantId: props.tenantId,
      workspaceId: props.workspaceId,
      attemptId: props.attemptId,
      answerId: props.answerId,
      questionId: props.questionId,
      kind,
      ...(language !== undefined ? { language } : {}),
      ...(props.source !== undefined ? { source: props.source } : {}),
      ...(props.notebookJson !== undefined ? { notebookJson: props.notebookJson } : {}),
      resourceLimits: props.resourceLimits,
      status: AssessmentExecutionStatusEnum.RESERVED,
      requestedByPrincipalId: props.requestedByPrincipalId,
      requestedAt: now,
      metadata: props.metadata ? { ...props.metadata } : {},
    });
  }

  static restore(props: AssessmentExecutionRequestProps): AssessmentExecutionRequest {
    return new AssessmentExecutionRequest(props);
  }

  markQueued(): void {
    this.status = AssessmentExecutionStatusEnum.QUEUED;
  }

  markRunning(): void {
    this.status = AssessmentExecutionStatusEnum.RUNNING;
  }

  markSucceeded(): void {
    this.status = AssessmentExecutionStatusEnum.SUCCEEDED;
  }

  markFailed(): void {
    this.status = AssessmentExecutionStatusEnum.FAILED;
  }

  markTimedOut(): void {
    this.status = AssessmentExecutionStatusEnum.TIMED_OUT;
  }

  markCancelled(): void {
    this.status = AssessmentExecutionStatusEnum.CANCELLED;
  }
}
