/**
 * AssessmentRepository Contract
 * Interface for persisting and retrieving assessments
 * Implementation deferred to 010B (Persistence and APIs)
 */

import { Assessment } from '../entities/index.js';
import { AssessmentPurpose } from '../value-objects/index.js';
import type { TransactionContext } from '@mentrily/service-core';

export abstract class AssessmentRepository {
  /**
   * Save an assessment (insert or update)
   */
  abstract save(assessment: Assessment, transaction?: TransactionContext): Promise<Assessment>;

  /**
   * Find an assessment by id
   */
  abstract findById(id: string, transaction?: TransactionContext): Promise<Assessment | null>;

  /**
   * List all assessments in a workspace
   */
  abstract listByWorkspace(
    workspaceId: string,
    transaction?: TransactionContext,
  ): Promise<Assessment[]>;

  /**
   * List assessments by purpose in a workspace
   */
  abstract listByPurpose(
    workspaceId: string,
    purpose: AssessmentPurpose,
    transaction?: TransactionContext,
  ): Promise<Assessment[]>;
}
