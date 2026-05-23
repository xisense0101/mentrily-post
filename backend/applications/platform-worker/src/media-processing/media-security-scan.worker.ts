import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import { MediaScanStatus, MediaSecurityScanJobStatus } from '@prisma/client';
import crypto from 'node:crypto';
import { FixtureMediaVirusScanner } from '../../../platform-api/src/modules/media-library/infrastructure/scanning/fixture-media-virus-scanner.adapter.js';
import type { MediaAsset } from '../../../platform-api/src/modules/media-library/domain/entities/media-asset.entity.js';

@Injectable()
export class MediaSecurityScanWorker {
  private readonly logger = new Logger(MediaSecurityScanWorker.name);
  private readonly workerId = `security-worker-${crypto.randomUUID()}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: FixtureMediaVirusScanner,
  ) {}

  async runOnce(batchSize = 10): Promise<{ claimed: number; processed: number; failed: number }> {
    const now = new Date();

    // 1. Claim jobs
    const claimedJobs = await this.prisma.$transaction(async (tx) => {
      const dueJobs = await tx.mediaSecurityScanJob.findMany({
        where: {
          status: { in: ['QUEUED', 'RETRYING'] },
          runAfter: { lte: now },
          lockedAt: null,
        },
        take: batchSize,
        select: { id: true, mediaAssetId: true, attempts: true, maxAttempts: true },
      });

      if (dueJobs.length === 0) return [];

      const jobIds = dueJobs.map((j) => j.id);

      await tx.mediaSecurityScanJob.updateMany({
        where: { id: { in: jobIds } },
        data: {
          status: 'SCANNING',
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
        const asset = await this.prisma.mediaAsset.findUnique({
          where: { id: job.mediaAssetId },
        });

        if (!asset) {
          throw new Error(`Media asset ${job.mediaAssetId} not found`);
        }

        // Delegate to FixtureMediaVirusScanner
        const scanResult = await this.scanner.scan(asset as unknown as MediaAsset, '');
        const { status, resultCode, resultMessage } = scanResult;

        await new Promise((resolve) => setTimeout(resolve, 50));

        if (status === 'FAILED') {
          throw new Error(resultMessage || 'Virus scan failed');
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.mediaSecurityScanJob.update({
            where: { id: job.id },
            data: {
              status: status === 'CLEAN' ? 'CLEAN' : 'INFECTED',
              resultCode,
              resultMessage,
              lockedAt: null,
              lockedBy: null,
            },
          });

          let scanStatus: MediaScanStatus = 'CLEAN';
          let quarantineReason: string | null = null;
          let quarantinedAt: Date | null = null;

          if (status === 'INFECTED') {
            scanStatus = 'QUARANTINED';
            quarantineReason = resultMessage;
            quarantinedAt = new Date();
          } else if (status === 'SUSPICIOUS') {
            scanStatus = 'SUSPICIOUS';
          }

          await tx.mediaAsset.update({
            where: { id: job.mediaAssetId },
            data: {
              scanStatus,
              scannedAt: new Date(),
              quarantineReason,
              quarantinedAt,
            },
          });

          // Trigger outbox event on security scan completed
          await tx.outboxMessage.create({
            data: {
              id: crypto.randomUUID(),
              eventId: crypto.randomUUID(),
              eventName: 'media.security_scan.completed',
              eventVersion: 1,
              tenantId: asset.tenantId,
              workspaceId: asset.workspaceId,
              correlationId: `scan-corr-${job.id}`,
              payload: {
                assetId: asset.id,
                scanStatus,
                resultCode,
                resultMessage,
              },
              occurredAt: new Date(),
              status: 'PENDING',
            },
          });
        });

        processed++;
      } catch (error) {
        failed++;
        const nextAttempts = job.attempts + 1;
        const isDead = nextAttempts >= job.maxAttempts;
        const asset = await this.prisma.mediaAsset.findUnique({
          where: { id: job.mediaAssetId },
        });

        await this.prisma.$transaction(async (tx) => {
          await tx.mediaSecurityScanJob.update({
            where: { id: job.id },
            data: {
              status: (isDead ? 'DEAD' : 'RETRYING') as MediaSecurityScanJobStatus,
              attempts: nextAttempts,
              lockedAt: null,
              lockedBy: null,
              ...(isDead
                ? {}
                : { runAfter: new Date(Date.now() + Math.pow(2, nextAttempts) * 1000) }),
              resultCode: 'SCAN_FAILED',
              resultMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });

          await tx.mediaAsset.update({
            where: { id: job.mediaAssetId },
            data: {
              scanStatus: 'SCAN_FAILED' as MediaScanStatus,
              scanErrorCode: 'SCAN_ERROR',
              scanErrorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });

          if (isDead && asset) {
            await tx.outboxMessage.create({
              data: {
                id: crypto.randomUUID(),
                eventId: crypto.randomUUID(),
                eventName: 'media.security_scan.completed',
                eventVersion: 1,
                tenantId: asset.tenantId,
                workspaceId: asset.workspaceId,
                correlationId: `scan-corr-${job.id}`,
                payload: {
                  assetId: asset.id,
                  scanStatus: 'SCAN_FAILED',
                  resultCode: 'SCAN_FAILED',
                  resultMessage: error instanceof Error ? error.message : 'Unknown error',
                },
                occurredAt: new Date(),
                status: 'PENDING',
              },
            });
          }
        });
      }
    }

    if (claimedJobs.length > 0) {
      this.logger.debug(
        `Media security scan run completed: claimed=${claimedJobs.length}, processed=${processed}, failed=${failed}`,
      );
    }

    return { claimed: claimedJobs.length, processed, failed };
  }
}
