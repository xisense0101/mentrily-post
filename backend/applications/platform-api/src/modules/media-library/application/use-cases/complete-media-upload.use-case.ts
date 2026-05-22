import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  AUDIT_RECORDER,
  type AuditRecorder,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  RequestContext,
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { mediaUploadCompleted } from '../../domain/events/index.js';
import {
  MediaAssetRepository,
  MediaUploadIntentRepository,
} from '../../domain/repositories/index.js';
import { mapMediaAssetToResponse } from '../mappers/index.js';
import type { MediaAssetResponse } from '../dto/index.js';
import {
  ensureMediaUploadIntentOwnership,
  requireMediaActor,
  ensureMediaAssetOwnership,
} from '../support/index.js';
import { MediaEventPublisherService, MediaProcessingService, MediaSecurityScanService } from '../services/index.js';

@Injectable()
export class CompleteMediaUploadUseCase {
  constructor(
    @Inject(MediaAssetRepository) private readonly assetRepository: MediaAssetRepository,
    @Inject(MediaUploadIntentRepository)
    private readonly intentRepository: MediaUploadIntentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(MediaEventPublisherService) private readonly eventPublisher: MediaEventPublisherService,
    @Inject(MediaProcessingService) private readonly processingService: MediaProcessingService,
    @Inject(MediaSecurityScanService) private readonly scanService: MediaSecurityScanService,
  ) {}

  async execute(
    context: RequestContext,
    uploadIntentId: string,
    input?: {
      sizeBytes?: number | undefined;
      checksumSha256?: string | undefined;
      metadata?: Record<string, unknown> | undefined;
    },
  ): Promise<MediaAssetResponse> {
    const workspace = requireMediaActor(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.MEDIA_UPLOAD_COMPLETE, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const intent = await this.intentRepository.findById(uploadIntentId, tx);
      if (!intent) {
        throw new AppError('NOT_FOUND', 'media upload intent not found', 404);
      }
      ensureMediaUploadIntentOwnership(intent, context);

      const asset = await this.assetRepository.findById(intent.assetId, tx);
      if (!asset) {
        throw new AppError('NOT_FOUND', 'media asset not found', 404);
      }
      ensureMediaAssetOwnership(asset, context);

      const savedIntent = await this.intentRepository.save(intent.complete(), tx);
      
      const uploadedAsset = asset.markUploaded({
        sizeBytes: input?.sizeBytes,
        checksumSha256: input?.checksumSha256,
        metadata: input?.metadata,
      });

      await this.scanService.enqueueScanForAsset(context, uploadedAsset, tx);
      const scannedAsset = uploadedAsset.queueScan();

      const jobs = await this.processingService.enqueueJobsForAsset(context, scannedAsset, tx);
      
      let finalAsset = scannedAsset;
      if (jobs.length > 0) {
        finalAsset = finalAsset.queueProcessing();
      } else {
        finalAsset = finalAsset.markAvailable();
      }

      const savedAsset = await this.assetRepository.save(finalAsset, tx);

      await this.auditRecorder.record(
        {
          action: 'media.upload.completed',
          actorId: workspace.actorId,
          targetType: 'media.asset',
          targetId: savedAsset.id,
          metadata: { uploadIntentId: savedIntent.id },
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        mediaUploadCompleted({
          tenantId: savedAsset.tenantId,
          workspaceId: savedAsset.workspaceId,
          uploadIntentId: savedIntent.id,
          assetId: savedAsset.id,
          objectKey: savedAsset.objectKey,
          contentType: savedAsset.contentType,
          fileCategory: savedAsset.fileCategory,
        }),
        context,
        tx,
      );

      return mapMediaAssetToResponse(savedAsset);
    });
  }
}
