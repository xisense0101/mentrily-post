import type { TransactionContext } from '@mentrily/service-core';
import type { MediaSecurityScanJob } from '../entities/index.js';

export abstract class MediaSecurityScanJobRepository {
  abstract save(job: MediaSecurityScanJob, transaction?: TransactionContext): Promise<MediaSecurityScanJob>;
  abstract findById(id: string, transaction?: TransactionContext): Promise<MediaSecurityScanJob | null>;
  abstract findByAssetId(mediaAssetId: string, transaction?: TransactionContext): Promise<MediaSecurityScanJob[]>;
  abstract claimDueJobs(
    input: { limit: number; workerId: string },
    transaction?: TransactionContext,
  ): Promise<MediaSecurityScanJob[]>;
}
