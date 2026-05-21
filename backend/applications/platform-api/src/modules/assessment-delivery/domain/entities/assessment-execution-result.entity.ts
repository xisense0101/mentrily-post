import type { AssessmentExecutionStatus } from '../value-objects/assessment-execution-status.vo.js';
import { assertValidAssessmentExecutionStatus } from '../value-objects/assessment-execution-status.vo.js';

export interface AssessmentExecutionResultProps {
  id: string;
  executionRequestId: string;
  status: AssessmentExecutionStatus;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  memoryMb?: number;
  provider?: string;
  error?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class AssessmentExecutionResult {
  readonly id: string;
  readonly executionRequestId: string;
  status: AssessmentExecutionStatus;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  memoryMb?: number;
  provider?: string;
  error?: string;
  metadata: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: AssessmentExecutionResultProps) {
    this.id = props.id;
    this.executionRequestId = props.executionRequestId;
    this.status = props.status;
    if (props.stdout !== undefined) {
      this.stdout = props.stdout;
    }
    if (props.stderr !== undefined) {
      this.stderr = props.stderr;
    }
    if (props.exitCode !== undefined) {
      this.exitCode = props.exitCode;
    }
    if (props.durationMs !== undefined) {
      this.durationMs = props.durationMs;
    }
    if (props.memoryMb !== undefined) {
      this.memoryMb = props.memoryMb;
    }
    if (props.provider !== undefined) {
      this.provider = props.provider;
    }
    if (props.error !== undefined) {
      this.error = props.error;
    }
    this.metadata = { ...props.metadata };
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: {
    id: string;
    executionRequestId: string;
    status: AssessmentExecutionStatus;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    durationMs?: number;
    memoryMb?: number;
    provider?: string;
    error?: string;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
  }): AssessmentExecutionResult {
    if (!props.id) {
      throw new Error('AssessmentExecutionResult id is required');
    }
    if (!props.executionRequestId) {
      throw new Error('AssessmentExecutionResult executionRequestId is required');
    }
    const status = assertValidAssessmentExecutionStatus(props.status);
    const now = props.createdAt ?? new Date();
    return new AssessmentExecutionResult({
      id: props.id,
      executionRequestId: props.executionRequestId,
      status,
      ...(props.stdout !== undefined ? { stdout: props.stdout } : {}),
      ...(props.stderr !== undefined ? { stderr: props.stderr } : {}),
      ...(props.exitCode !== undefined ? { exitCode: props.exitCode } : {}),
      ...(props.durationMs !== undefined ? { durationMs: props.durationMs } : {}),
      ...(props.memoryMb !== undefined ? { memoryMb: props.memoryMb } : {}),
      ...(props.provider !== undefined ? { provider: props.provider } : {}),
      ...(props.error !== undefined ? { error: props.error } : {}),
      metadata: props.metadata ? { ...props.metadata } : {},
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: AssessmentExecutionResultProps): AssessmentExecutionResult {
    return new AssessmentExecutionResult(props);
  }
}
