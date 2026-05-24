import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type {
  CampaignAudiencePreviewRequestContract,
  CampaignMessagePreviewRequestContract,
  CreateCampaignRequestContract,
  ScheduleCampaignRequestContract,
  UpdateCampaignRequestContract,
} from '@mentrily/contract-catalog';
import { AppError, type RequestContext } from '@mentrily/service-core';
import {
  ArchiveCampaignUseCase,
  CreateCampaignUseCase,
  GetCampaignUseCase,
  ListCampaignsUseCase,
  PreviewCampaignAudienceUseCase,
  PreviewCampaignMessageUseCase,
  ScheduleCampaignUseCase,
  UpdateCampaignUseCase,
} from '../../../communication-center/application/index.js';

@Controller('/workspace/campaigns')
export class CampaignManagementController {
  constructor(
    @Inject(CreateCampaignUseCase)
    private readonly createCampaign: CreateCampaignUseCase,
    @Inject(ListCampaignsUseCase)
    private readonly listCampaigns: ListCampaignsUseCase,
    @Inject(GetCampaignUseCase)
    private readonly getCampaign: GetCampaignUseCase,
    @Inject(UpdateCampaignUseCase)
    private readonly updateCampaign: UpdateCampaignUseCase,
    @Inject(ArchiveCampaignUseCase)
    private readonly archiveCampaign: ArchiveCampaignUseCase,
    @Inject(ScheduleCampaignUseCase)
    private readonly scheduleCampaign: ScheduleCampaignUseCase,
    @Inject(PreviewCampaignAudienceUseCase)
    private readonly previewAudience: PreviewCampaignAudienceUseCase,
    @Inject(PreviewCampaignMessageUseCase)
    private readonly previewMessage: PreviewCampaignMessageUseCase,
  ) {}

  @Get()
  async list(@Req() request: FastifyRequest) {
    return this.listCampaigns.execute(this.requestContext(request));
  }

  @Post()
  async create(@Req() request: FastifyRequest, @Body() body: CreateCampaignRequestContract) {
    return this.createCampaign.execute(this.requestContext(request), body);
  }

  @Get('/:campaignId')
  async get(@Req() request: FastifyRequest, @Param('campaignId') campaignId: string) {
    return this.getCampaign.execute(this.requestContext(request), campaignId);
  }

  @Patch('/:campaignId')
  async update(
    @Req() request: FastifyRequest,
    @Param('campaignId') campaignId: string,
    @Body() body: UpdateCampaignRequestContract,
  ) {
    return this.updateCampaign.execute(this.requestContext(request), campaignId, body);
  }

  @Post('/:campaignId/archive')
  async archive(@Req() request: FastifyRequest, @Param('campaignId') campaignId: string) {
    return this.archiveCampaign.execute(this.requestContext(request), campaignId);
  }

  @Delete('/:campaignId/archive')
  async deleteArchive(@Req() request: FastifyRequest, @Param('campaignId') campaignId: string) {
    return this.archiveCampaign.execute(this.requestContext(request), campaignId);
  }

  @Delete('/:campaignId')
  async delete(@Req() request: FastifyRequest, @Param('campaignId') campaignId: string) {
    return this.archiveCampaign.execute(this.requestContext(request), campaignId);
  }

  @Post('/:campaignId/schedule')
  async schedule(
    @Req() request: FastifyRequest,
    @Param('campaignId') campaignId: string,
    @Body() body: ScheduleCampaignRequestContract,
  ) {
    return this.scheduleCampaign.execute(
      this.requestContext(request),
      campaignId,
      body.scheduledFor,
    );
  }

  @Post('/audience/preview')
  async audiencePreview(
    @Req() request: FastifyRequest,
    @Body() body: CampaignAudiencePreviewRequestContract,
  ) {
    return this.previewAudience.execute(this.requestContext(request), body);
  }

  @Post('/message/preview')
  async messagePreview(
    @Req() request: FastifyRequest,
    @Body() body: CampaignMessagePreviewRequestContract,
  ) {
    return this.previewMessage.execute(this.requestContext(request), body);
  }

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }
    return context;
  }
}
