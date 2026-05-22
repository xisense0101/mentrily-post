import { AppError, RequestContext } from '@mentrily/service-core';
import { MediaAssetRepository } from '../../../media-library/domain/repositories/index.js';
import type { AddLearningLessonInput } from '../dto/add-learning-lesson.dto.js';
import { LearningContentKind } from '../../domain/value-objects/learning-content-kind.vo.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function validateLearningMediaReference(
  assetRepository: MediaAssetRepository,
  context: RequestContext,
  input: AddLearningLessonInput,
): Promise<void> {
  const workspace = context.workspace;
  if (!workspace) {
    throw new AppError('UNAUTHORIZED', 'missing workspace context', 401);
  }

  const { kind, contentRef } = input;
  if (!contentRef || contentRef.trim().length === 0) {
    return;
  }

  const isUuid = UUID_REGEX.test(contentRef);
  const isMediaKind =
    kind === LearningContentKind.VIDEO || kind === LearningContentKind.FILE;

  if (isMediaKind || isUuid) {
    if (!isUuid) {
      throw new AppError(
        'VALIDATION_ERROR',
        `lesson of kind ${kind} requires a valid MediaAsset ID as contentRef`,
        400,
      );
    }

    const asset = await assetRepository.findById(contentRef);
    if (!asset) {
      throw new AppError('VALIDATION_ERROR', 'referenced media asset not found', 400, {
        assetId: contentRef,
      });
    }

    if (asset.tenantId !== workspace.tenantId || asset.workspaceId !== workspace.workspaceId) {
      throw new AppError('VALIDATION_ERROR', 'referenced media asset does not belong to this workspace', 400, {
        assetId: asset.id,
      });
    }

    if (asset.status !== 'AVAILABLE') {
      throw new AppError('VALIDATION_ERROR', 'referenced media asset is not available', 400, {
        assetId: asset.id,
        status: asset.status,
      });
    }

    if (kind === LearningContentKind.VIDEO && asset.fileCategory !== 'VIDEO') {
      throw new AppError('VALIDATION_ERROR', 'VIDEO lesson requires a VIDEO media asset', 400);
    }
  }
}
