import type { TransactionContext } from '@mentrily/service-core';
import { AssessmentAnswerGrade, AssessmentGradingRun } from '../entities/index.js';

export abstract class AssessmentGradingRepository {
  abstract saveRun(
    run: AssessmentGradingRun,
    transaction?: TransactionContext,
  ): Promise<AssessmentGradingRun>;

  abstract findRunById(
    runId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentGradingRun | null>;

  abstract findLatestRunByAttemptId(
    attemptId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentGradingRun | null>;

  abstract listRunsByAttemptId(
    attemptId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentGradingRun[]>;

  abstract listPendingManualReview(
    input: { workspaceId: string },
    transaction?: TransactionContext,
  ): Promise<AssessmentAnswerGrade[]>;
}
