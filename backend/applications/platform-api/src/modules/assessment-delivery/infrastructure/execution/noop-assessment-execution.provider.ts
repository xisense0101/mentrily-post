import { Injectable } from '@nestjs/common';
import {
  type AssessmentExecutionProvider,
  type AssessmentExecutionProviderRequest,
  type AssessmentExecutionProviderResult,
} from '../../application/ports/index.js';
import { AssessmentExecutionStatusEnum } from '../../domain/value-objects/index.js';

@Injectable()
export class NoopAssessmentExecutionProvider implements AssessmentExecutionProvider {
  private readonly providerName = 'noop-assessment-execution-provider';
  private readonly results = new Map<string, AssessmentExecutionProviderResult>();

  async requestExecution(
    input: AssessmentExecutionProviderRequest,
  ): Promise<AssessmentExecutionProviderResult> {
    const result: AssessmentExecutionProviderResult = {
      executionRequestId: input.executionRequestId,
      status: AssessmentExecutionStatusEnum.PROVIDER_UNAVAILABLE,
      provider: this.providerName,
      error: 'execution provider unavailable',
      metadata: {
        requestReservationStatus: AssessmentExecutionStatusEnum.RESERVED,
      },
    };
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
    const result: AssessmentExecutionProviderResult = {
      executionRequestId,
      status: AssessmentExecutionStatusEnum.CANCELLED,
      provider: this.providerName,
      ...(existing?.error !== undefined ? { error: existing.error } : {}),
      metadata: {
        ...(existing?.metadata ?? {}),
        cancelled: true,
      },
    };
    this.results.set(executionRequestId, result);
  }
}
