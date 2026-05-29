/**
 * AssessmentAttemptRepository Contract
 * Abstract interface for persisting and retrieving assessment attempts
 */

import { AssessmentAttempt } from '../entities/assessment-attempt.entity.js';
import type { TransactionContext } from '@mentrily/service-core';

export abstract class AssessmentAttemptRepository {
  /**
   * Save an attempt aggregate (upsert: insert or update)
   */
  abstract save(
    attempt: AssessmentAttempt,
    transaction?: TransactionContext,
  ): Promise<AssessmentAttempt>;

  /**
   * Find an attempt by its ID
   */
  abstract findById(
    id: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentAttempt | null>;

  /**
   * List all attempts for a learner in a workspace
   */
  abstract listByLearner(
    input: { workspaceId: string; learnerPrincipalId: string },
    transaction?: TransactionContext,
  ): Promise<AssessmentAttempt[]>;

  /**
   * List all attempts for a learner on a specific assessment
   */
  abstract listByAssessmentAndLearner(
    input: { assessmentId: string; learnerPrincipalId: string },
    transaction?: TransactionContext,
  ): Promise<AssessmentAttempt[]>;

  /**
   * Find the current in-progress attempt for a learner on a specific assessment.
   */
  abstract findInProgressByAssessmentAndLearner(
    input: { assessmentId: string; learnerPrincipalId: string },
    transaction?: TransactionContext,
  ): Promise<AssessmentAttempt | null>;

  /**
   * Acquire a transaction-level lock on the attempt row to prevent concurrent modifications/grading runs.
   */
  abstract acquireRowLock(id: string, transaction: TransactionContext): Promise<void>;
}
