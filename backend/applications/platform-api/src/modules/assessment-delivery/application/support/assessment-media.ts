import { AppError, RequestContext } from '@mentrily/service-core';
import type {
  AssessmentFileUploadQuestionConfigContract,
  AssessmentMediaAttachmentContract,
  AssessmentSubmittedFileContract,
} from '@mentrily/contract-catalog';
import type { MediaAsset } from '../../../media-library/domain/entities/index.js';
import type { MediaAssetRepository } from '../../../media-library/domain/repositories/index.js';
import type { AssessmentQuestion } from '../../domain/entities/index.js';

const ASSESSMENT_MEDIA_KEY = 'assessmentMedia';

interface StoredAssessmentMediaState {
  attachments?: AssessmentMediaAttachmentContract[] | undefined;
  fileUploadConfig?: AssessmentFileUploadQuestionConfigContract | undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function sanitizeQuestionMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const base = asRecord(metadata);
  const next = { ...base };
  delete next[ASSESSMENT_MEDIA_KEY];
  return next;
}

export function readQuestionMediaState(
  metadata: Record<string, unknown> | undefined,
): StoredAssessmentMediaState {
  const base = asRecord(metadata);
  const stored = asRecord(base[ASSESSMENT_MEDIA_KEY]);
  const attachments = Array.isArray(stored.attachments)
    ? stored.attachments.filter(
        (value): value is AssessmentMediaAttachmentContract =>
          typeof value === 'object' &&
          value !== null &&
          typeof (value as { mediaAssetId?: unknown }).mediaAssetId === 'string' &&
          typeof (value as { filename?: unknown }).filename === 'string',
      )
    : undefined;
  const fileUploadConfig =
    stored.fileUploadConfig && typeof stored.fileUploadConfig === 'object'
      ? (stored.fileUploadConfig as AssessmentFileUploadQuestionConfigContract)
      : undefined;

  return {
    ...(attachments ? { attachments } : {}),
    ...(fileUploadConfig ? { fileUploadConfig } : {}),
  };
}

export function writeQuestionMediaState(input: {
  metadata?: Record<string, unknown> | undefined;
  attachments?: AssessmentMediaAttachmentContract[] | undefined;
  fileUploadConfig?: AssessmentFileUploadQuestionConfigContract | undefined;
}): Record<string, unknown> {
  const next = sanitizeQuestionMetadata(input.metadata);
  if (!input.attachments && !input.fileUploadConfig) {
    return next;
  }

  next[ASSESSMENT_MEDIA_KEY] = {
    ...(input.attachments ? { attachments: input.attachments } : {}),
    ...(input.fileUploadConfig ? { fileUploadConfig: input.fileUploadConfig } : {}),
  };
  return next;
}

export function normalizeFileUploadConfig(
  input: AssessmentFileUploadQuestionConfigContract | undefined,
): AssessmentFileUploadQuestionConfigContract | undefined {
  if (!input) {
    return undefined;
  }

  const next: AssessmentFileUploadQuestionConfigContract = {};
  if (Array.isArray(input.allowedFileCategories) && input.allowedFileCategories.length > 0) {
    next.allowedFileCategories = [...new Set(input.allowedFileCategories)];
  }
  if (Array.isArray(input.allowedContentTypes) && input.allowedContentTypes.length > 0) {
    next.allowedContentTypes = uniqueStrings(input.allowedContentTypes);
  }
  if (input.maxFiles !== undefined) {
    if (!Number.isInteger(input.maxFiles) || input.maxFiles <= 0) {
      throw new AppError('VALIDATION_ERROR', 'file upload maxFiles must be a positive integer', 400);
    }
    next.maxFiles = input.maxFiles;
  }
  if (input.maxFileSizeBytes !== undefined) {
    if (!Number.isFinite(input.maxFileSizeBytes) || input.maxFileSizeBytes <= 0) {
      throw new AppError(
        'VALIDATION_ERROR',
        'file upload maxFileSizeBytes must be a positive number',
        400,
      );
    }
    next.maxFileSizeBytes = input.maxFileSizeBytes;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export function readSubmittedFiles(
  answer: Record<string, unknown>,
): AssessmentSubmittedFileContract[] {
  const submittedFiles = (answer as { submittedFiles?: unknown }).submittedFiles;
  return Array.isArray(submittedFiles)
    ? submittedFiles.filter(
        (value): value is AssessmentSubmittedFileContract =>
          typeof value === 'object' &&
          value !== null &&
          typeof (value as { mediaAssetId?: unknown }).mediaAssetId === 'string' &&
          typeof (value as { filename?: unknown }).filename === 'string',
      )
    : [];
}

export function readFileUploadAnswerMediaAssetIds(answer: Record<string, unknown>): string[] {
  const mediaAssetIds = (answer as { mediaAssetIds?: unknown }).mediaAssetIds;
  return Array.isArray(mediaAssetIds)
    ? uniqueStrings(
        mediaAssetIds.filter((value): value is string => typeof value === 'string'),
      )
    : [];
}

export function normalizeFileUploadAnswerPayload(input: {
  answer: Record<string, unknown>;
  submittedFiles: AssessmentSubmittedFileContract[];
}): Record<string, unknown> {
  return {
    mediaAssetIds: input.submittedFiles.map((file) => file.mediaAssetId),
    submittedFiles: input.submittedFiles,
  };
}

function toAttachment(asset: MediaAsset): AssessmentMediaAttachmentContract {
  return {
    mediaAssetId: asset.id,
    filename: asset.filename,
    contentType: asset.contentType,
    fileCategory: asset.fileCategory,
    ...(asset.sizeBytes !== undefined ? { sizeBytes: Number(asset.sizeBytes) } : {}),
    status: asset.status,
  };
}

async function loadAssetOrThrow(
  assetRepository: MediaAssetRepository,
  assetId: string,
): Promise<MediaAsset> {
  const asset = await assetRepository.findById(assetId);
  if (!asset) {
    throw new AppError('VALIDATION_ERROR', 'referenced media asset not found', 400, { assetId });
  }

  return asset;
}

function assertWorkspaceOwnership(asset: MediaAsset, context: RequestContext): void {
  const workspace = context.workspace;
  if (!workspace) {
    throw new AppError('UNAUTHORIZED', 'missing workspace context', 401);
  }
  if (asset.tenantId !== workspace.tenantId || asset.workspaceId !== workspace.workspaceId) {
    throw new AppError('VALIDATION_ERROR', 'referenced media asset does not belong to this workspace', 400, {
      assetId: asset.id,
    });
  }
}

function assertAvailable(asset: MediaAsset): void {
  if (asset.status !== 'AVAILABLE') {
    throw new AppError('VALIDATION_ERROR', 'referenced media asset is not available', 400, {
      assetId: asset.id,
      status: asset.status,
    });
  }
}

export async function validateQuestionAttachments(input: {
  assetRepository: MediaAssetRepository;
  context: RequestContext;
  attachments?: Array<{ mediaAssetId: string }> | undefined;
}): Promise<AssessmentMediaAttachmentContract[] | undefined> {
  if (!input.attachments || input.attachments.length === 0) {
    return undefined;
  }

  const resolved: AssessmentMediaAttachmentContract[] = [];
  for (const reference of input.attachments) {
    const asset = await loadAssetOrThrow(input.assetRepository, reference.mediaAssetId);
    assertWorkspaceOwnership(asset, input.context);
    assertAvailable(asset);
    resolved.push(toAttachment(asset));
  }

  return resolved;
}

export async function validateFileUploadAnswer(input: {
  assetRepository: MediaAssetRepository;
  context: RequestContext;
  actorId: string;
  question: AssessmentQuestion;
  answer: Record<string, unknown>;
  attemptId: string;
  assessmentId: string;
}): Promise<Record<string, unknown>> {
  const mediaAssetIds = readFileUploadAnswerMediaAssetIds(input.answer);
  const mediaState = readQuestionMediaState(input.question.metadata);
  const config = normalizeFileUploadConfig(mediaState.fileUploadConfig);

  if (config?.maxFiles !== undefined && mediaAssetIds.length > config.maxFiles) {
    throw new AppError('VALIDATION_ERROR', 'too many files submitted for this question', 400, {
      maxFiles: config.maxFiles,
    });
  }

  const submittedFiles: AssessmentSubmittedFileContract[] = [];
  for (const mediaAssetId of mediaAssetIds) {
    const asset = await loadAssetOrThrow(input.assetRepository, mediaAssetId);
    assertWorkspaceOwnership(asset, input.context);
    assertAvailable(asset);

    if (asset.ownerPrincipalId !== input.actorId) {
      throw new AppError('VALIDATION_ERROR', 'submitted media asset must belong to the learner', 400, {
        assetId: asset.id,
      });
    }

    if (
      config?.allowedFileCategories &&
      !config.allowedFileCategories.includes(asset.fileCategory)
    ) {
      throw new AppError('VALIDATION_ERROR', 'submitted media asset file category is not allowed', 400, {
        assetId: asset.id,
        fileCategory: asset.fileCategory,
      });
    }

    if (
      config?.allowedContentTypes &&
      config.allowedContentTypes.length > 0 &&
      !config.allowedContentTypes.includes(asset.contentType)
    ) {
      throw new AppError('VALIDATION_ERROR', 'submitted media asset content type is not allowed', 400, {
        assetId: asset.id,
        contentType: asset.contentType,
      });
    }

    if (
      config?.maxFileSizeBytes !== undefined &&
      asset.sizeBytes !== undefined &&
      Number(asset.sizeBytes) > config.maxFileSizeBytes
    ) {
      throw new AppError('VALIDATION_ERROR', 'submitted media asset exceeds allowed file size', 400, {
        assetId: asset.id,
        maxFileSizeBytes: config.maxFileSizeBytes,
      });
    }

    const assetMetadata = asRecord(asset.metadata);
    const usage = assetMetadata.assessmentUsage;
    if (typeof usage === 'string' && usage !== 'ASSESSMENT_SUBMISSION') {
      throw new AppError('VALIDATION_ERROR', 'submitted media asset has an invalid assessment usage context', 400, {
        assetId: asset.id,
      });
    }
    if (
      typeof assetMetadata.assessmentAttemptId === 'string' &&
      assetMetadata.assessmentAttemptId !== input.attemptId
    ) {
      throw new AppError('VALIDATION_ERROR', 'submitted media asset belongs to a different attempt', 400, {
        assetId: asset.id,
      });
    }
    if (
      typeof assetMetadata.assessmentQuestionId === 'string' &&
      assetMetadata.assessmentQuestionId !== input.question.id
    ) {
      throw new AppError('VALIDATION_ERROR', 'submitted media asset belongs to a different question', 400, {
        assetId: asset.id,
      });
    }
    if (
      typeof assetMetadata.assessmentId === 'string' &&
      assetMetadata.assessmentId !== input.assessmentId
    ) {
      throw new AppError('VALIDATION_ERROR', 'submitted media asset belongs to a different assessment', 400, {
        assetId: asset.id,
      });
    }

    submittedFiles.push(toAttachment(asset));
  }

  return normalizeFileUploadAnswerPayload({ answer: input.answer, submittedFiles });
}
