import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import { MediaAssetStatus, MediaProcessingJobStatus } from '@prisma/client';
import crypto from 'node:crypto';

@Injectable()
export class MediaProcessingWorker {
  private readonly logger = new Logger(MediaProcessingWorker.name);
  private readonly workerId = `worker-${crypto.randomUUID()}`;

  constructor(private readonly prisma: PrismaService) {}

  async runOnce(batchSize = 10): Promise<{ claimed: number; processed: number; failed: number }> {
    const now = new Date();
    
    // 1. Claim jobs
    const claimedJobs = await this.prisma.$transaction(async (tx) => {
      const dueJobs = await tx.mediaProcessingJob.findMany({
        where: {
          status: { in: ['QUEUED', 'RETRYING'] },
          runAfter: { lte: now },
          lockedAt: null,
        },
        take: batchSize,
        select: { id: true, mediaAssetId: true, jobType: true, attempts: true, maxAttempts: true },
      });

      if (dueJobs.length === 0) return [];

      const jobIds = dueJobs.map(j => j.id);
      
      await tx.mediaProcessingJob.updateMany({
        where: { id: { in: jobIds } },
        data: {
          status: 'PROCESSING',
          lockedAt: now,
          lockedBy: this.workerId,
        },
      });

      return dueJobs;
    });

    let processed = 0;
    let failed = 0;

    for (const job of claimedJobs) {
      try {
        // Mock processing logic using fixture wait
        await new Promise((resolve) => setTimeout(resolve, 50));
        
        await this.prisma.$transaction(async (tx) => {
          // Update job
          await tx.mediaProcessingJob.update({
            where: { id: job.id },
            data: { status: 'SUCCEEDED', lockedAt: null, lockedBy: null },
          });

          // Check asset status
          await this.evaluateAssetStatus(job.mediaAssetId, tx);
        });

        processed++;
      } catch (error) {
        failed++;
        const nextAttempts = job.attempts + 1;
        const isDead = nextAttempts >= job.maxAttempts;
        
        await this.prisma.$transaction(async (tx) => {
          await tx.mediaProcessingJob.update({
            where: { id: job.id },
            data: {
              status: (isDead ? 'DEAD' : 'RETRYING') as MediaProcessingJobStatus,
              attempts: nextAttempts,
              lockedAt: null,
              lockedBy: null,
              ...(isDead ? {} : { runAfter: new Date(Date.now() + Math.pow(2, nextAttempts) * 1000) }),
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });

          await this.evaluateAssetStatus(job.mediaAssetId, tx);
        });
      }
    }

    if (claimedJobs.length > 0) {
      this.logger.debug(
        `Media processing run completed: claimed=${claimedJobs.length}, processed=${processed}, failed=${failed}`,
      );
    }

    return { claimed: claimedJobs.length, processed, failed };
  }

  private async evaluateAssetStatus(assetId: string, tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0]) {
    const allJobs = await tx.mediaProcessingJob.findMany({
      where: { mediaAssetId: assetId },
      select: { status: true },
    });

    const hasDead = allJobs.some((j) => j.status === 'DEAD' || j.status === 'FAILED');
    const hasPending = allJobs.some((j) => ['QUEUED', 'PROCESSING', 'RETRYING'].includes(j.status));

    if (hasPending) {
      return; // Still processing
    }

    if (hasDead) {
      await tx.mediaAsset.update({
        where: { id: assetId },
        data: { status: 'PROCESSING_FAILED' as MediaAssetStatus },
      });
    } else {
      await tx.mediaAsset.update({
        where: { id: assetId },
        data: { status: 'AVAILABLE' as MediaAssetStatus },
      });
    }
  }
}
