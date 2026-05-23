import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import type { Prisma } from '@prisma/client';
import { MediaAssetStatus, MediaProcessingJobStatus, MediaRenditionKind } from '@prisma/client';
import crypto from 'node:crypto';
import type { MediaAsset } from '../../../platform-api/src/modules/media-library/domain/entities/media-asset.entity.js';
import type { MediaProcessingJob } from '../../../platform-api/src/modules/media-library/domain/entities/media-processing-job.entity.js';
import { FixtureMediaMetadataExtractor } from '../../../platform-api/src/modules/media-library/infrastructure/processing/fixture-media-metadata-extractor.adapter.js';
import { FixtureMediaRenditionGenerator } from '../../../platform-api/src/modules/media-library/infrastructure/processing/fixture-media-rendition-generator.adapter.js';
import {
  resolveMediaProcessingTemplate,
  runMediaProcessingHooks,
  type MediaPlannedRenditionSummary,
  type MediaProcessingHookStage,
  type MediaProcessingSummary,
  type MediaProcessingTemplateDefinition,
} from '../../../platform-api/src/modules/media-library/application/support/index.js';

type ProcessingJobRecord = {
  id: string;
  mediaAssetId: string;
  jobType: string;
  attempts: number;
  maxAttempts: number;
};

type AssetRecord = {
  id: string;
  tenantId: string;
  workspaceId: string;
  ownerPrincipalId: string;
  filename: string;
  contentType: string;
  fileCategory: MediaAsset['fileCategory'];
  sizeBytes: bigint | null;
  checksumSha256: string | null;
  storageProvider: MediaAsset['storageProvider'];
  objectKey: string;
  visibility: MediaAsset['visibility'];
  status: MediaAsset['status'];
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  scanStatus: MediaAsset['scanStatus'];
  scannedAt: Date | null;
  scanErrorCode: string | null;
  scanErrorMessage: string | null;
  quarantineReason: string | null;
  quarantinedAt: Date | null;
  deleteAfter: Date | null;
  deletedAt: Date | null;
};

function asMetadataRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class MediaProcessingWorker {
  private readonly logger = new Logger(MediaProcessingWorker.name);
  private readonly workerId = `worker-${crypto.randomUUID()}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataExtractor: FixtureMediaMetadataExtractor,
    private readonly renditionGenerator: FixtureMediaRenditionGenerator,
  ) {}

  async runOnce(batchSize = 10): Promise<{ claimed: number; processed: number; failed: number }> {
    const now = new Date();

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

      if (dueJobs.length === 0) {
        return [];
      }

      await tx.mediaProcessingJob.updateMany({
        where: { id: { in: dueJobs.map((job) => job.id) } },
        data: {
          status: 'PROCESSING',
          lockedAt: now,
          lockedBy: this.workerId,
          attempts: { increment: 1 },
        },
      });

      return dueJobs;
    });

    let processed = 0;
    let failed = 0;

    for (const job of claimedJobs) {
      try {
        await this.processJob(job);
        processed += 1;
      } catch (error) {
        failed += 1;
        await this.handleFailure(job, error);
      }
    }

    if (claimedJobs.length > 0) {
      this.logger.debug(
        `Media processing run completed: claimed=${claimedJobs.length}, processed=${processed}, failed=${failed}`,
      );
    }

    return { claimed: claimedJobs.length, processed, failed };
  }

  private async processJob(job: ProcessingJobRecord): Promise<void> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: job.mediaAssetId } });
    if (!asset) {
      throw new Error(`Media asset ${job.mediaAssetId} not found`);
    }

    if (!this.canProcessAsset(asset)) {
      throw new Error(
        `Media asset ${asset.id} cannot be processed in state ${asset.status}/${asset.scanStatus}`,
      );
    }

    const domainAsset = this.toDomainAsset(asset);
    const domainJob = {
      id: job.id,
      workspaceId: asset.workspaceId,
      mediaAssetId: asset.id,
      jobType: job.jobType as MediaProcessingJob['jobType'],
      status: 'PROCESSING' as MediaProcessingJob['status'],
      attempts: job.attempts + 1,
      maxAttempts: job.maxAttempts,
      runAfter: new Date(),
      idempotencyKey: `media-job-${asset.id}-${job.jobType}`,
      createdAt: asset.createdAt,
      updatedAt: new Date(),
    } as MediaProcessingJob;
    const template = resolveMediaProcessingTemplate(domainAsset);
    const assetMetadata = asMetadataRecord(asset.metadata);
    const existingSummary = this.readProcessingSummary(assetMetadata);
    let summary = this.buildProcessingSummary(template, existingSummary?.completedHookStages ?? []);

    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: 'PROCESSING' as MediaAssetStatus,
        metadata: toInputJsonValue(this.withProcessingMetadata(assetMetadata, summary)),
      },
    });

    summary = this.runHookStage('PROCESSING_STARTED', domainAsset, domainJob, summary);

    const extractedMetadata = template.config.metadata.extractBasicMetadata
      ? await this.metadataExtractor.extractMetadata(domainAsset, '')
      : {};

    summary = this.runHookStage('METADATA_EXTRACTED', domainAsset, domainJob, summary);

    const nextMetadata = {
      ...assetMetadata,
      mediaDimensions:
        template.config.metadata.extractImageDimensions &&
        typeof extractedMetadata.width === 'number' &&
        typeof extractedMetadata.height === 'number'
          ? { width: extractedMetadata.width, height: extractedMetadata.height }
          : assetMetadata.mediaDimensions,
      mediaDurationSeconds:
        template.config.metadata.extractDuration &&
        typeof extractedMetadata.durationSeconds === 'number'
          ? extractedMetadata.durationSeconds
          : assetMetadata.mediaDurationSeconds,
    };

    if (template.key === 'IMAGE_STANDARD') {
      const alreadyExists = await this.prisma.mediaRendition.findFirst({
        where: { mediaAssetId: asset.id, kind: 'THUMBNAIL' },
        select: { id: true },
      });

      if (!alreadyExists) {
        const rendition = await this.renditionGenerator.generateRendition(
          domainAsset,
          '',
          'THUMBNAIL',
        );
        await this.prisma.mediaRendition.create({
          data: {
            id: crypto.randomUUID(),
            workspaceId: asset.workspaceId,
            mediaAssetId: asset.id,
            kind: rendition.kind as MediaRenditionKind,
            mimeType: rendition.mimeType,
            sizeBytes: rendition.sizeBytes,
            width: rendition.width ?? null,
            height: rendition.height ?? null,
            durationSeconds: rendition.durationSeconds ?? null,
            storageKey: `renditions/${asset.id}/${rendition.kind.toLowerCase()}`,
          },
        });
      }

      summary = this.runHookStage('RENDITION_CREATED', domainAsset, domainJob, summary);
    }

    summary = {
      ...summary,
      lastProcessedAt: new Date().toISOString(),
    };
    summary = this.runHookStage('PROCESSING_SUCCEEDED', domainAsset, domainJob, summary);

    await this.prisma.$transaction(async (tx) => {
      await tx.mediaProcessingJob.update({
        where: { id: job.id },
        data: { status: 'SUCCEEDED', lockedAt: null, lockedBy: null, updatedAt: new Date() },
      });

      await tx.mediaAsset.update({
        where: { id: asset.id },
        data: {
          status: 'AVAILABLE',
          metadata: toInputJsonValue(this.withProcessingMetadata(nextMetadata, summary)),
        },
      });
    });
  }

  private async handleFailure(job: ProcessingJobRecord, error: unknown): Promise<void> {
    const sanitizedMessage =
      error instanceof Error
        ? error.message.replace(/storageKey|objectKey/gi, 'redacted')
        : 'Unknown error';
    const nextAttempts = job.attempts + 1;
    const isDead = nextAttempts >= job.maxAttempts;
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: job.mediaAssetId } });

    await this.prisma.$transaction(async (tx) => {
      await tx.mediaProcessingJob.update({
        where: { id: job.id },
        data: {
          status: (isDead ? 'DEAD' : 'RETRYING') as MediaProcessingJobStatus,
          attempts: nextAttempts,
          lockedAt: null,
          lockedBy: null,
          ...(isDead ? {} : { runAfter: new Date(Date.now() + Math.pow(2, nextAttempts) * 1000) }),
          errorMessage: sanitizedMessage,
        },
      });

      if (asset) {
        const assetMetadata = asMetadataRecord(asset.metadata);
        const domainAsset = this.toDomainAsset(asset);
        const domainJob = {
          id: job.id,
          workspaceId: asset.workspaceId,
          mediaAssetId: asset.id,
          jobType: job.jobType as MediaProcessingJob['jobType'],
          status: 'FAILED' as MediaProcessingJob['status'],
          attempts: nextAttempts,
          maxAttempts: job.maxAttempts,
          runAfter: new Date(),
          idempotencyKey: `media-job-${asset.id}-${job.jobType}`,
          createdAt: asset.createdAt,
          updatedAt: new Date(),
        } as MediaProcessingJob;
        const template = resolveMediaProcessingTemplate(domainAsset);
        const summary = this.runHookStage(
          'PROCESSING_FAILED',
          domainAsset,
          domainJob,
          this.buildProcessingSummary(
            template,
            this.readProcessingSummary(assetMetadata)?.completedHookStages ?? [],
          ),
        );

        await tx.mediaAsset.update({
          where: { id: asset.id },
          data: {
            status: 'PROCESSING_FAILED',
            metadata: toInputJsonValue(this.withProcessingMetadata(assetMetadata, summary)),
          },
        });
      }
    });
  }

  private canProcessAsset(asset: AssetRecord): boolean {
    if (asset.deletedAt || asset.status === 'DELETED' || asset.status === 'DELETE_QUEUED') {
      return false;
    }

    return asset.scanStatus === 'CLEAN';
  }

  private toDomainAsset(asset: AssetRecord): MediaAsset {
    return {
      ...asset,
      metadata: asMetadataRecord(asset.metadata),
      sizeBytes: asset.sizeBytes === null ? undefined : Number(asset.sizeBytes),
      checksumSha256: asset.checksumSha256 ?? undefined,
      archivedAt: asset.archivedAt ?? undefined,
      scannedAt: asset.scannedAt ?? undefined,
      scanErrorCode: asset.scanErrorCode ?? undefined,
      scanErrorMessage: asset.scanErrorMessage ?? undefined,
      quarantineReason: asset.quarantineReason ?? undefined,
      quarantinedAt: asset.quarantinedAt ?? undefined,
      deleteAfter: asset.deleteAfter ?? undefined,
      deletedAt: asset.deletedAt ?? undefined,
    } as MediaAsset;
  }

  private buildProcessingSummary(
    template: MediaProcessingTemplateDefinition,
    completedHookStages: MediaProcessingHookStage[],
  ): MediaProcessingSummary {
    const plannedRenditions: MediaPlannedRenditionSummary[] = [
      ...template.config.imageRenditions.map((preset) => ({
        kind: preset.kind,
        label: 'Thumbnail',
        status: preset.status,
        format: preset.format,
        width: preset.width,
        height: preset.height,
      })),
      ...template.config.deferredRenditions.map((preset) => ({
        kind: preset.kind,
        label: preset.label,
        status: preset.status,
        format: preset.format,
      })),
    ];

    return {
      template: {
        key: template.key,
        name: template.name,
        description: template.description,
        fileCategory: template.fileCategory,
      },
      metadata: template.config.metadata,
      plannedRenditions,
      completedHookStages,
    };
  }

  private runHookStage(
    stage: MediaProcessingHookStage,
    asset: MediaAsset,
    job: MediaProcessingJob,
    summary: MediaProcessingSummary,
  ): MediaProcessingSummary {
    const result = runMediaProcessingHooks({
      asset,
      job,
      stage,
      processingSummary: summary,
    });

    if (result.skipped || summary.completedHookStages.includes(stage)) {
      return summary;
    }

    return {
      ...summary,
      completedHookStages: [...summary.completedHookStages, stage],
    };
  }

  private withProcessingMetadata(
    metadata: Record<string, unknown>,
    summary: MediaProcessingSummary,
  ): Record<string, unknown> {
    return {
      ...metadata,
      processingTemplate: summary.template,
      processingSummary: summary,
    };
  }

  private readProcessingSummary(
    metadata: Record<string, unknown>,
  ): MediaProcessingSummary | undefined {
    const value = metadata.processingSummary;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as MediaProcessingSummary;
  }
}
