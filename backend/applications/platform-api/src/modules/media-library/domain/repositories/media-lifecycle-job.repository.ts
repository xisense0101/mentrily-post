import type { TransactionContext } from '@mentrily/service-core';
import type { MediaLifecycleJob } from '../entities/index.js';

export abstract class MediaLifecycleJobRepository {
  abstract save(job: MediaLifecycleJob, transaction?: TransactionContext): Promise<MediaLifecycleJob>;
  abstract findById(id: string, transaction?: TransactionContext): Promise<MediaLifecycleJob | null>;
  abstract findByAssetId(mediaAssetId: string, transaction?: TransactionContext): Promise<MediaLifecycleJob[]>;
  abstract claimDueJobs(
    input: { limit: number; workerId: string },
    transaction?: TransactionContext,
  ): Promise<MediaLifecycleJob[]>;
}
