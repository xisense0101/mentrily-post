import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, RequestContext } from '@mentrily/service-core';
import {
  ArchiveContentDocumentUseCase,
  CreateContentDocumentInput,
  CreateContentDocumentUseCase,
  GetContentDocumentUseCase,
  GetLatestContentSnapshotUseCase,
  ListContentDocumentsUseCase,
  PublishContentDocumentInput,
  PublishContentDocumentUseCase,
  ReplaceContentBlocksInput,
  ReplaceContentBlocksUseCase,
  RestoreContentDocumentUseCase,
  UpdateContentDocumentInput,
  UpdateContentDocumentUseCase,
} from '../../application/index.js';

@Controller('/workspace/content/documents')
export class ContentStudioController {
  constructor(
    @Inject(CreateContentDocumentUseCase)
    private readonly createDocument: CreateContentDocumentUseCase,
    @Inject(ListContentDocumentsUseCase)
    private readonly listDocuments: ListContentDocumentsUseCase,
    @Inject(GetContentDocumentUseCase)
    private readonly getDocument: GetContentDocumentUseCase,
    @Inject(UpdateContentDocumentUseCase)
    private readonly updateDocument: UpdateContentDocumentUseCase,
    @Inject(ReplaceContentBlocksUseCase)
    private readonly replaceBlocks: ReplaceContentBlocksUseCase,
    @Inject(PublishContentDocumentUseCase)
    private readonly publishDocument: PublishContentDocumentUseCase,
    @Inject(ArchiveContentDocumentUseCase)
    private readonly archiveDocument: ArchiveContentDocumentUseCase,
    @Inject(RestoreContentDocumentUseCase)
    private readonly restoreDocument: RestoreContentDocumentUseCase,
    @Inject(GetLatestContentSnapshotUseCase)
    private readonly getLatestSnapshot: GetLatestContentSnapshotUseCase,
  ) {}

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }

    return context;
  }

  @Post()
  async create(@Req() request: FastifyRequest, @Body() body: CreateContentDocumentInput) {
    return this.createDocument.execute(this.requestContext(request), body);
  }

  @Get()
  async list(@Req() request: FastifyRequest, @Query('purpose') purpose?: string) {
    return this.listDocuments.execute(this.requestContext(request), purpose);
  }

  @Get('/:documentId')
  async getOne(@Req() request: FastifyRequest, @Param('documentId') documentId: string) {
    return this.getDocument.execute(this.requestContext(request), documentId);
  }

  @Patch('/:documentId')
  async update(
    @Req() request: FastifyRequest,
    @Param('documentId') documentId: string,
    @Body() body: UpdateContentDocumentInput,
  ) {
    return this.updateDocument.execute(this.requestContext(request), documentId, body);
  }

  @Put('/:documentId/blocks')
  async replaceDraftBlocks(
    @Req() request: FastifyRequest,
    @Param('documentId') documentId: string,
    @Body() body: ReplaceContentBlocksInput,
  ) {
    return this.replaceBlocks.execute(this.requestContext(request), documentId, body);
  }

  @Post('/:documentId/publish')
  async publish(
    @Req() request: FastifyRequest,
    @Param('documentId') documentId: string,
    @Body() body: PublishContentDocumentInput,
  ) {
    return this.publishDocument.execute(this.requestContext(request), documentId, body);
  }

  @Post('/:documentId/archive')
  async archive(@Req() request: FastifyRequest, @Param('documentId') documentId: string) {
    return this.archiveDocument.execute(this.requestContext(request), documentId);
  }

  @Post('/:documentId/restore')
  async restore(@Req() request: FastifyRequest, @Param('documentId') documentId: string) {
    return this.restoreDocument.execute(this.requestContext(request), documentId);
  }

  @Get('/:documentId/snapshots/latest')
  async latestSnapshot(@Req() request: FastifyRequest, @Param('documentId') documentId: string) {
    return this.getLatestSnapshot.execute(this.requestContext(request), documentId);
  }
}
