import { Injectable } from '@nestjs/common';
import {
  type AssessmentExecutionProvider,
  type AssessmentExecutionProviderRequest,
  type AssessmentExecutionProviderResult,
} from '../../application/ports/index.js';
import { AssessmentExecutionStatusEnum } from '../../domain/value-objects/index.js';

type FixtureExecutionCase = 'success' | 'failed' | 'timeout' | 'provider_unavailable' | 'cancelled';

interface FixtureExecutionMetadata {
  fixtureExecutionCase?: FixtureExecutionCase;
  fixtureStdout?: string;
  fixtureStderr?: string;
  fixtureExitCode?: number;
  fixtureDurationMs?: number;
}

@Injectable()
export class FixtureAssessmentExecutionProvider implements AssessmentExecutionProvider {
  private readonly providerName = 'fixture-assessment-execution-provider';
  private readonly results = new Map<string, AssessmentExecutionProviderResult>();

  async requestExecution(
    input: AssessmentExecutionProviderRequest,
  ): Promise<AssessmentExecutionProviderResult> {
    const metadata = this.readFixtureMetadata(input.metadata);
    const fixtureCase = metadata.fixtureExecutionCase;
    if (fixtureCase === undefined) {
      throw new Error('Fixture execution metadata is required');
    }

    const result = this.createResult(input.executionRequestId, metadata, fixtureCase);
    this.results.set(input.executionRequestId, result);
    return result;
  }

  async getExecutionResult(
    executionRequestId: string,
  ): Promise<AssessmentExecutionProviderResult | null> {
    return this.results.get(executionRequestId) ?? null;
  }

  async cancelExecution(executionRequestId: string): Promise<void> {
    const existing = this.results.get(executionRequestId);
    const cancelled: AssessmentExecutionProviderResult = {
      executionRequestId,
      status: AssessmentExecutionStatusEnum.CANCELLED,
      provider: this.providerName,
      ...(existing?.stdout !== undefined ? { stdout: existing.stdout } : {}),
      ...(existing?.stderr !== undefined ? { stderr: existing.stderr } : {}),
      ...(existing?.exitCode !== undefined ? { exitCode: existing.exitCode } : {}),
      ...(existing?.durationMs !== undefined ? { durationMs: existing.durationMs } : {}),
      ...(existing?.memoryMb !== undefined ? { memoryMb: existing.memoryMb } : {}),
      metadata: {
        ...(existing?.metadata ?? {}),
        fixtureExecutionCase: 'cancelled',
      },
    };
    this.results.set(executionRequestId, cancelled);
  }

  private readFixtureMetadata(raw: Record<string, unknown>): FixtureExecutionMetadata {
    const metadata: FixtureExecutionMetadata = {};
    const fixtureExecutionCase = this.readFixtureCase(raw.fixtureExecutionCase);
    if (fixtureExecutionCase !== undefined) {
      metadata.fixtureExecutionCase = fixtureExecutionCase;
    }
    if (typeof raw.fixtureStdout === 'string') {
      metadata.fixtureStdout = raw.fixtureStdout;
    }
    if (typeof raw.fixtureStderr === 'string') {
      metadata.fixtureStderr = raw.fixtureStderr;
    }
    if (typeof raw.fixtureExitCode === 'number') {
      metadata.fixtureExitCode = raw.fixtureExitCode;
    }
    if (typeof raw.fixtureDurationMs === 'number') {
      metadata.fixtureDurationMs = raw.fixtureDurationMs;
    }
    return metadata;
  }

  private readFixtureCase(value: unknown): FixtureExecutionCase | undefined {
    switch (value) {
      case 'success':
      case 'failed':
      case 'timeout':
      case 'provider_unavailable':
      case 'cancelled':
        return value;
      default:
        return undefined;
    }
  }

  private createResult(
    executionRequestId: string,
    metadata: FixtureExecutionMetadata,
    fixtureCase: FixtureExecutionCase,
  ): AssessmentExecutionProviderResult {
    const base: AssessmentExecutionProviderResult = {
      executionRequestId,
      status: this.mapStatus(fixtureCase),
      provider: this.providerName,
      durationMs: metadata.fixtureDurationMs ?? 25,
      metadata: {
        fixtureExecutionCase: fixtureCase,
      },
    };

    return {
      ...base,
      ...(metadata.fixtureStdout !== undefined ? { stdout: metadata.fixtureStdout } : {}),
      ...(metadata.fixtureStderr !== undefined ? { stderr: metadata.fixtureStderr } : {}),
      ...(metadata.fixtureExitCode !== undefined ? { exitCode: metadata.fixtureExitCode } : {}),
      ...(fixtureCase === 'provider_unavailable' ? { error: 'fixture provider unavailable' } : {}),
    };
  }

  private mapStatus(fixtureCase: FixtureExecutionCase) {
    switch (fixtureCase) {
      case 'success':
        return AssessmentExecutionStatusEnum.SUCCEEDED;
      case 'failed':
        return AssessmentExecutionStatusEnum.FAILED;
      case 'timeout':
        return AssessmentExecutionStatusEnum.TIMED_OUT;
      case 'provider_unavailable':
        return AssessmentExecutionStatusEnum.PROVIDER_UNAVAILABLE;
      case 'cancelled':
        return AssessmentExecutionStatusEnum.CANCELLED;
    }
  }
}
