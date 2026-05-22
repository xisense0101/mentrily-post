import type { TransactionContext } from '@mentrily/service-core';
import type { MediaProcessingJob } from '../entities/index.js';

export abstract class MediaProcessingJobRepository {
  abstract save(job: MediaProcessingJob, transaction?: TransactionContext): Promise<MediaProcessingJob>;
  abstract findById(id: string, transaction?: TransactionContext): Promise<MediaProcessingJob | null>;
  abstract findByAssetId(mediaAssetId: string, transaction?: TransactionContext): Promise<MediaProcessingJob[]>;
  abstract claimDueJobs(
    input: { limit: number; workerId: string },
    transaction?: TransactionContext,
  ): Promise<MediaProcessingJob[]>;
}
