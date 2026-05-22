import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import crypto from 'node:crypto';

@Injectable()
export class MediaLifecycleWorker {
  private readonly logger = new Logger(MediaLifecycleWorker.name);
  private readonly workerId = `lifecycle-worker-${crypto.randomUUID()}`;

  constructor(private readonly prisma: PrismaService) {}

  async runOnce(batchSize = 10): Promise<{ claimed: number; processed: number; failed: number }> {
    const now = new Date();

    // 1. Discover expired upload intents/assets and queue them for deletion
    await this.discoverAndQueueExpirations(now);

    // 2. Claim due lifecycle jobs
    const claimedJobs = await this.prisma.$transaction(async (tx) => {
      const dueJobs = await tx.mediaLifecycleJob.findMany({
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
      
      await tx.mediaLifecycleJob.updateMany({
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
        if (!job.mediaAssetId) {
          throw new Error('lifecycle job has no associated mediaAssetId');
        }

        const asset = await this.prisma.mediaAsset.findUnique({
          where: { id: job.mediaAssetId },
          include: { renditions: true },
        });

        if (asset) {
          // Check if referenced
          const referenced = await this.isAssetReferenced(asset.id);
          if (referenced) {
            this.logger.warn(`[Lifecycle Cleanup] Skipping deletion for asset ${asset.id} because it is actively referenced`);
            await this.prisma.mediaLifecycleJob.update({
              where: { id: job.id },
              data: {
                status: 'FAILED',
                errorCode: 'ASSET_REFERENCED',
                errorMessage: `Media asset ${asset.id} is actively referenced by content or assessment modules`,
                lockedAt: null,
                lockedBy: null,
              },
            });
            processed++;
            continue;
          }

          // Simulation of issuing object storage deletes
          this.logger.log(`[Storage Cleanup] Deleting origin object for asset: ${asset.id}`);
          for (const rendition of asset.renditions) {
            this.logger.log(`[Storage Cleanup] Deleting rendition ${rendition.id} for asset: ${asset.id}`);
          }

          await this.prisma.$transaction(async (tx) => {
            // Delete renditions from database
            await tx.mediaRendition.deleteMany({
              where: { mediaAssetId: asset.id },
            });

            // Transition asset status to DELETED
            await tx.mediaAsset.update({
              where: { id: asset.id },
              data: {
                status: 'DELETED',
                deletedAt: new Date(),
              },
            });

            // Update lifecycle job status to SUCCEEDED
            await tx.mediaLifecycleJob.update({
              where: { id: job.id },
              data: {
                status: 'SUCCEEDED',
                lockedAt: null,
                lockedBy: null,
              },
            });
          });
        } else {
          // If asset is already gone, just succeed the job
          await this.prisma.mediaLifecycleJob.update({
            where: { id: job.id },
            data: {
              status: 'SUCCEEDED',
              lockedAt: null,
              lockedBy: null,
            },
          });
        }

        processed++;
      } catch (error) {
        failed++;
        const nextAttempts = job.attempts + 1;
        const isDead = nextAttempts >= job.maxAttempts;

        await this.prisma.$transaction(async (tx) => {
          await tx.mediaLifecycleJob.update({
            where: { id: job.id },
            data: {
              status: isDead ? 'DEAD' : 'RETRYING',
              attempts: nextAttempts,
              lockedAt: null,
              lockedBy: null,
              ...(isDead ? {} : { runAfter: new Date(Date.now() + Math.pow(2, nextAttempts) * 1000) }),
              errorCode: 'CLEANUP_FAILED',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        });
      }
    }

    if (claimedJobs.length > 0) {
      this.logger.debug(
        `Media lifecycle run completed: claimed=${claimedJobs.length}, processed=${processed}, failed=${failed}`,
      );
    }

    return { claimed: claimedJobs.length, processed, failed };
  }

  private async discoverAndQueueExpirations(now: Date): Promise<void> {
    // 1. Uncompleted / Pending uploads older than 24 hours -> transition to ABANDONED
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const expiredUploads = await this.prisma.mediaAsset.findMany({
      where: {
        status: 'PENDING_UPLOAD',
        createdAt: { lt: twentyFourHoursAgo },
      },
      select: { id: true, workspaceId: true },
    });

    for (const asset of expiredUploads) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.mediaAsset.update({
            where: { id: asset.id },
            data: { status: 'ABANDONED' },
          });

          const jobId = crypto.randomUUID();
          const idempotencyKey = `lifecycle-delete-abandoned-${asset.id}`;
          const existing = await tx.mediaLifecycleJob.findFirst({
            where: { idempotencyKey },
          });

          if (!existing) {
            await tx.mediaLifecycleJob.create({
              data: {
                id: jobId,
                workspaceId: asset.workspaceId,
                mediaAssetId: asset.id,
                jobType: 'DELETE_ASSET',
                status: 'QUEUED',
                attempts: 0,
                maxAttempts: 3,
                runAfter: new Date(),
                idempotencyKey,
              },
            });
          }
        });
      } catch (err) {
        this.logger.error(`Failed to abandon expired asset ${asset.id}`, err);
      }
    }

    // 2. Active delete requests / deleteAfter expired items -> transition to DELETE_QUEUED
    const assetsToDelete = await this.prisma.mediaAsset.findMany({
      where: {
        OR: [
          { status: 'DELETE_QUEUED' },
          {
            deleteAfter: { lt: now },
            status: { notIn: ['DELETED', 'PENDING_UPLOAD', 'DELETE_QUEUED'] },
          },
        ],
      },
      select: { id: true, workspaceId: true, status: true },
    });

    for (const asset of assetsToDelete) {
      try {
        await this.prisma.$transaction(async (tx) => {
          if (asset.status !== 'DELETE_QUEUED') {
            await tx.mediaAsset.update({
              where: { id: asset.id },
              data: { status: 'DELETE_QUEUED' },
            });
          }

          const jobId = crypto.randomUUID();
          const idempotencyKey = `lifecycle-delete-${asset.id}`;
          const existing = await tx.mediaLifecycleJob.findFirst({
            where: { idempotencyKey },
          });

          if (!existing) {
            await tx.mediaLifecycleJob.create({
              data: {
                id: jobId,
                workspaceId: asset.workspaceId,
                mediaAssetId: asset.id,
                jobType: 'DELETE_ASSET',
                status: 'QUEUED',
                attempts: 0,
                maxAttempts: 3,
                runAfter: new Date(),
                idempotencyKey,
              },
            });
          }
        });
      } catch (err) {
        this.logger.error(`Failed to queue delete for asset ${asset.id}`, err);
      }
    }
  }

  private async isAssetReferenced(assetId: string): Promise<boolean> {
    // Check LearningLesson
    const lesson = await this.prisma.learningLesson.findFirst({
      where: { contentRef: assetId },
      select: { id: true },
    });
    if (lesson) return true;

    // Check ContentBlock
    const block = await this.prisma.contentBlock.findFirst({
      where: {
        content: {
          path: ['mediaAssetId'],
          equals: assetId,
        },
      },
      select: { id: true },
    });
    if (block) return true;

    // Check AssessmentQuestion
    const questions = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "AssessmentQuestion" 
      WHERE "metadata"::text LIKE ${`%"mediaAssetId":"${assetId}"%`}
      LIMIT 1
    `;
    if (questions && questions.length > 0) return true;

    // Check AssessmentAttemptAnswer
    const answers = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "AssessmentAttemptAnswer" 
      WHERE "answer"::text LIKE ${`%"mediaAssetId":"${assetId}"%`}
         OR "answer"::text LIKE ${`%"${assetId}"%`}
      LIMIT 1
    `;
    if (answers && answers.length > 0) return true;

    return false;
  }
}
