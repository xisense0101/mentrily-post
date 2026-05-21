/**
 * AssessmentSnapshotRepository Contract
 * Interface for persisting and retrieving published snapshots
 * Implementation deferred to 010B (Persistence and APIs)
 */

import { AssessmentPublishedSnapshot } from '../entities/index.js';
import type { TransactionContext } from '@mentrily/service-core';

export abstract class AssessmentSnapshotRepository {
  /**
   * Save a published snapshot
   */
  abstract save(
    snapshot: AssessmentPublishedSnapshot,
    transaction?: TransactionContext,
  ): Promise<AssessmentPublishedSnapshot>;

  /**
   * Find the latest published snapshot for an assessment
   */
  abstract findLatestByAssessmentId(
    assessmentId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentPublishedSnapshot | null>;

  abstract findById(
    snapshotId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentPublishedSnapshot | null>;

  /**
   * List all published snapshots for an assessment
   */
  abstract listByAssessmentId(
    assessmentId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentPublishedSnapshot[]>;
}
