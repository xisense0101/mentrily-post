import { randomUUID } from 'node:crypto';
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
import { MediaAsset, MediaUploadIntent } from '../../domain/entities/index.js';
import { mediaAssetCreated, mediaUploadIntentCreated } from '../../domain/events/index.js';
import {
  MediaAssetRepository,
  MediaUploadIntentRepository,
} from '../../domain/repositories/index.js';
import { MediaUploadPolicyService } from '../../domain/services/index.js';
import { mapMediaUploadIntentToResponse } from '../mappers/index.js';
import type { CreateMediaUploadIntentInput, MediaUploadIntentResponse } from '../dto/index.js';
import { requireMediaActor } from '../support/index.js';
import { MediaEventPublisherService } from '../services/index.js';
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from '../../infrastructure/storage/index.js';

function safeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-');
}

@Injectable()
export class CreateMediaUploadIntentUseCase {
  constructor(
    @Inject(MediaAssetRepository) private readonly assetRepository: MediaAssetRepository,
    @Inject(MediaUploadIntentRepository)
    private readonly intentRepository: MediaUploadIntentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: ObjectStoragePort,
    @Inject(MediaUploadPolicyService) private readonly uploadPolicy: MediaUploadPolicyService,
    @Inject(MediaEventPublisherService) private readonly eventPublisher: MediaEventPublisherService,
  ) {}

  async execute(
    context: RequestContext,
    input: CreateMediaUploadIntentInput,
  ): Promise<MediaUploadIntentResponse> {
    const workspace = requireMediaActor(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.MEDIA_ASSET_CREATE, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const filename = this.uploadPolicy.validateFilename(input.filename);
    const contentType = this.uploadPolicy.validateContentType(input.contentType);
    const fileCategory = this.uploadPolicy.validateFileCategory(input.fileCategory);
    const maxSizeBytes = this.uploadPolicy.validateMaxSize(fileCategory, input.maxSizeBytes);

    return this.transactionRunner.run(async (tx) => {
      const assetId = randomUUID();
      const objectKey = `tenants/${workspace.tenantId}/workspaces/${workspace.workspaceId}/media/${assetId}/${safeFilename(filename)}`;
      const asset = MediaAsset.createPending({
        id: assetId,
        tenantId: workspace.tenantId,
        workspaceId: workspace.workspaceId,
        ownerPrincipalId: workspace.actorId,
        filename,
        contentType,
        fileCategory,
        storageProvider: 'FIXTURE',
        objectKey,
        visibility: input.visibility ?? 'PRIVATE',
        metadata: input.metadata ?? {},
      });

      const expiresAt = this.uploadPolicy.calculateUploadIntentExpiry();
      const upload = await this.objectStorage.createUploadUrl({
        provider: asset.storageProvider,
        objectKey: asset.objectKey,
        contentType: asset.contentType,
        method: 'PUT',
        expiresAt,
      });

      const intent = MediaUploadIntent.create({
        id: randomUUID(),
        tenantId: workspace.tenantId,
        workspaceId: workspace.workspaceId,
        assetId: asset.id,
        ownerPrincipalId: workspace.actorId,
        objectKey: asset.objectKey,
        contentType: asset.contentType,
        filename: asset.filename,
        fileCategory: asset.fileCategory,
        maxSizeBytes,
        uploadUrl: upload.url,
        uploadMethod: upload.method,
        headers: upload.headers,
        expiresAt: upload.expiresAt,
        metadata: input.metadata ?? {},
      });

      await this.assetRepository.save(asset, tx);
      const savedIntent = await this.intentRepository.save(intent, tx);

      await this.auditRecorder.record(
        {
          action: 'media.upload_intent.created',
          actorId: workspace.actorId,
          targetType: 'media.upload_intent',
          targetId: savedIntent.id,
          metadata: { assetId: asset.id },
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        mediaAssetCreated({
          tenantId: asset.tenantId,
          workspaceId: asset.workspaceId,
          assetId: asset.id,
          objectKey: asset.objectKey,
          contentType: asset.contentType,
          fileCategory: asset.fileCategory,
        }),
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        mediaUploadIntentCreated({
          tenantId: intent.tenantId,
          workspaceId: intent.workspaceId,
          uploadIntentId: intent.id,
          assetId: asset.id,
          objectKey: intent.objectKey,
          contentType: intent.contentType,
          fileCategory: intent.fileCategory,
        }),
        context,
        tx,
      );

      return mapMediaUploadIntentToResponse(savedIntent);
    });
  }
}
