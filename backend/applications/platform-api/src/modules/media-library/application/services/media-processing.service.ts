import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RequestContext, TransactionContext } from '@mentrily/service-core';
import { MediaProcessingJobRepository } from '../../domain/repositories/media-processing-job.repository.js';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import { MediaProcessingJob } from '../../domain/entities/media-processing-job.entity.js';
import type { MediaProcessingJobType } from '../../domain/value-objects/index.js';

@Injectable()
export class MediaProcessingService {
  constructor(
    @Inject(MediaProcessingJobRepository)
    private readonly jobRepo: MediaProcessingJobRepository,
  ) {}

  async enqueueJobsForAsset(
    context: RequestContext,
    asset: MediaAsset,
    transaction?: TransactionContext,
  ): Promise<MediaProcessingJob[]> {
    const jobs: MediaProcessingJob[] = [];

    // Always extract metadata
    jobs.push(this.createJob(asset, 'METADATA_EXTRACTION'));

    // Generate thumbnails for images, videos, etc.
    if (asset.fileCategory === 'IMAGE' || asset.fileCategory === 'VIDEO') {
      jobs.push(this.createJob(asset, 'THUMBNAIL_GENERATION'));
    }

    // Transcode videos
    if (asset.fileCategory === 'VIDEO' || asset.fileCategory === 'AUDIO') {
      jobs.push(this.createJob(asset, 'TRANSCODING'));
    }

    const savedJobs: MediaProcessingJob[] = [];
    for (const job of jobs) {
      savedJobs.push(await this.jobRepo.save(job, transaction));
    }

    return savedJobs;
  }

  private createJob(asset: MediaAsset, jobType: MediaProcessingJobType): MediaProcessingJob {
    return MediaProcessingJob.enqueue({
      id: randomUUID(),
      workspaceId: asset.workspaceId,
      mediaAssetId: asset.id,
      jobType,
      idempotencyKey: `media-job-${asset.id}-${jobType}`,
    });
  }
}
