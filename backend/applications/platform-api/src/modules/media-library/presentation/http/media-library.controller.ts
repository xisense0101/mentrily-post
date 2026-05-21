import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, RequestContext } from '@mentrily/service-core';
import {
  ArchiveMediaAssetUseCase,
  CompleteMediaUploadUseCase,
  CreateMediaUploadIntentInput,
  CreateMediaUploadIntentUseCase,
  GetMediaAssetUseCase,
  GetMediaReadUrlUseCase,
  ListMediaAssetsUseCase,
} from '../../application/index.js';

@Controller('/workspace/media')
export class MediaLibraryController {
  constructor(
    @Inject(CreateMediaUploadIntentUseCase)
    private readonly createUploadIntent: CreateMediaUploadIntentUseCase,
    @Inject(CompleteMediaUploadUseCase) private readonly completeUpload: CompleteMediaUploadUseCase,
    @Inject(ListMediaAssetsUseCase) private readonly listAssets: ListMediaAssetsUseCase,
    @Inject(GetMediaAssetUseCase) private readonly getAsset: GetMediaAssetUseCase,
    @Inject(GetMediaReadUrlUseCase) private readonly createReadUrl: GetMediaReadUrlUseCase,
    @Inject(ArchiveMediaAssetUseCase) private readonly archiveAsset: ArchiveMediaAssetUseCase,
  ) {}

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }

    return context;
  }

  @Post('/upload-intents')
  async createIntent(@Req() request: FastifyRequest, @Body() body: CreateMediaUploadIntentInput) {
    return this.createUploadIntent.execute(this.requestContext(request), body);
  }

  @Post('/upload-intents/:uploadIntentId/complete')
  async complete(
    @Req() request: FastifyRequest,
    @Param('uploadIntentId') uploadIntentId: string,
    @Body()
    body: {
      sizeBytes?: number | undefined;
      checksumSha256?: string | undefined;
      metadata?: Record<string, unknown> | undefined;
    },
  ) {
    return this.completeUpload.execute(this.requestContext(request), uploadIntentId, body);
  }

  @Get('/assets')
  async list(
    @Req() request: FastifyRequest,
    @Query('status') status?: 'PENDING_UPLOAD' | 'AVAILABLE' | 'ARCHIVED' | 'FAILED',
    @Query('fileCategory')
    fileCategory?: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'ARCHIVE' | 'OTHER',
    @Query('ownerPrincipalId') ownerPrincipalId?: string,
  ) {
    return this.listAssets.execute(this.requestContext(request), {
      status,
      fileCategory,
      ownerPrincipalId,
    });
  }

  @Get('/assets/:assetId')
  async getOne(@Req() request: FastifyRequest, @Param('assetId') assetId: string) {
    return this.getAsset.execute(this.requestContext(request), assetId);
  }

  @Post('/assets/:assetId/read-url')
  async readUrl(@Req() request: FastifyRequest, @Param('assetId') assetId: string) {
    return this.createReadUrl.execute(this.requestContext(request), assetId);
  }

  @Post('/assets/:assetId/archive')
  async archive(@Req() request: FastifyRequest, @Param('assetId') assetId: string) {
    return this.archiveAsset.execute(this.requestContext(request), assetId);
  }
}
