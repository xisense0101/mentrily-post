import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { MediaReadUrlResponse } from '../../../media-library/application/dto/index.js';
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from '../../../media-library/infrastructure/index.js';
import { MediaAssetRepository } from '../../../media-library/domain/repositories/index.js';
import { AssessmentAttemptRepository } from '../../domain/repositories/index.js';
import {
  readFileUploadAnswerMediaAssetIds,
  requireAssessmentActor,
} from '../support/index.js';

@Injectable()
export class CreateAssessmentAttemptAnswerReadUrlUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository)
    private readonly attemptRepository: AssessmentAttemptRepository,
    @Inject(MediaAssetRepository) private readonly mediaAssetRepository: MediaAssetRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: ObjectStoragePort,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    attemptId: string,
    answerId: string,
    assetId: string,
  ): Promise<MediaReadUrlResponse> {
    const workspace = requireAssessmentActor(context);
    const attempt = await this.attemptRepository.findById(attemptId);
    if (
      !attempt ||
      attempt.tenantId !== workspace.tenantId ||
      attempt.workspaceId !== workspace.workspaceId
    ) {
      throw new AppError('NOT_FOUND', 'assessment attempt not found', 404);
    }

    const answer = attempt.answers.find((candidate) => candidate.id === answerId);
    if (!answer) {
      throw new AppError('NOT_FOUND', 'assessment attempt answer not found', 404);
    }
    if (answer.questionKind !== 'FILE_UPLOAD') {
      throw new AppError('VALIDATION_ERROR', 'answer does not contain submitted files', 400);
    }

    const mediaAssetIds = readFileUploadAnswerMediaAssetIds(answer.answer);
    if (!mediaAssetIds.includes(assetId)) {
      throw new AppError('NOT_FOUND', 'submitted file not found for this answer', 404);
    }

    const isOwner = attempt.learnerPrincipalId === workspace.actorId;
    if (!isOwner) {
      const elevatedPermissions = await Promise.all([
        this.permissionEvaluator.evaluate(
          { permission: PermissionCatalog.MEDIA_READ_URL_CREATE, workspace },
          context,
        ),
        this.permissionEvaluator.evaluate(
          { permission: PermissionCatalog.ASSESSMENT_GRADING_READ, workspace },
          context,
        ),
        this.permissionEvaluator.evaluate(
          { permission: PermissionCatalog.ASSESSMENT_RESULT_READ_WORKSPACE, workspace },
          context,
        ),
      ]);
      if (!elevatedPermissions.some((permission) => permission.allowed)) {
        throw new AppError('FORBIDDEN', 'permission denied', 403);
      }
    }

    const asset = await this.mediaAssetRepository.findById(assetId);
    if (!asset || asset.tenantId !== workspace.tenantId || asset.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'submitted media asset not found', 404);
    }
    if (asset.status !== 'AVAILABLE') {
      throw new AppError('CONFLICT', 'submitted media asset is unavailable', 409);
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const readUrl = await this.objectStorage.createReadUrl({
      provider: asset.storageProvider,
      objectKey: asset.objectKey,
      filename: asset.filename,
      expiresAt,
    });
    return {
      url: readUrl.url,
      method: readUrl.method,
      headers: readUrl.headers,
      expiresAt: readUrl.expiresAt.toISOString(),
    };
  }
}
