import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, type RequestContext } from '@mentrily/service-core';
import type {
  CreateCampaignRequestContract,
  UpdateCampaignRequestContract,
  ScheduleCampaignRequestContract,
  CampaignAudiencePreviewRequestContract,
  CampaignMessagePreviewRequestContract,
} from '@mentrily/contract-catalog';
import {
  ArchiveNotificationTemplateUseCase,
  CreateNotificationIntentUseCase,
  CreateNotificationTemplateUseCase,
  GetNotificationIntentUseCase,
  GetNotificationTemplateUseCase,
  ListNotificationIntentsUseCase,
  ListNotificationTemplatesUseCase,
  MarkNotificationIntentDispatchedUseCase,
  MarkNotificationIntentFailedUseCase,
  RenderNotificationTemplateUseCase,
  ListNotificationsUseCase,
  GetNotificationUseCase,
  MarkNotificationReadUseCase,
  MarkNotificationUnreadUseCase,
  MarkNotificationArchivedUseCase,
  GetUnreadCountUseCase,
  GetPreferencesUseCase,
  UpdatePreferencesUseCase,
  CreateCampaignUseCase,
  UpdateCampaignUseCase,
  GetCampaignUseCase,
  ListCampaignsUseCase,
  ArchiveCampaignUseCase,
  ScheduleCampaignUseCase,
  PreviewCampaignAudienceUseCase,
  PreviewCampaignMessageUseCase,
  type CreateNotificationIntentInput,
  type CreateNotificationTemplateInput,
  type MarkNotificationIntentDispatchedInput,
  type MarkNotificationIntentFailedInput,
  type RenderNotificationTemplateInput,
  type UpdateNotificationPreferencesInput,
} from '../../application/index.js';

@Controller('/workspace/communication')
export class CommunicationCenterController {
  constructor(
    @Inject(CreateNotificationTemplateUseCase)
    private readonly createTemplate: CreateNotificationTemplateUseCase,
    @Inject(ListNotificationTemplatesUseCase)
    private readonly listTemplates: ListNotificationTemplatesUseCase,
    @Inject(GetNotificationTemplateUseCase)
    private readonly getTemplate: GetNotificationTemplateUseCase,
    @Inject(RenderNotificationTemplateUseCase)
    private readonly renderTemplateUseCase: RenderNotificationTemplateUseCase,
    @Inject(ArchiveNotificationTemplateUseCase)
    private readonly archiveTemplate: ArchiveNotificationTemplateUseCase,
    @Inject(CreateNotificationIntentUseCase)
    private readonly createIntent: CreateNotificationIntentUseCase,
    @Inject(ListNotificationIntentsUseCase)
    private readonly listIntents: ListNotificationIntentsUseCase,
    @Inject(GetNotificationIntentUseCase) private readonly getIntent: GetNotificationIntentUseCase,
    @Inject(MarkNotificationIntentDispatchedUseCase)
    private readonly markDispatched: MarkNotificationIntentDispatchedUseCase,
    @Inject(MarkNotificationIntentFailedUseCase)
    private readonly markFailed: MarkNotificationIntentFailedUseCase,
    @Inject(ListNotificationsUseCase)
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    @Inject(GetNotificationUseCase) private readonly getNotificationUseCase: GetNotificationUseCase,
    @Inject(MarkNotificationReadUseCase)
    private readonly markReadUseCase: MarkNotificationReadUseCase,
    @Inject(MarkNotificationUnreadUseCase)
    private readonly markUnreadUseCase: MarkNotificationUnreadUseCase,
    @Inject(MarkNotificationArchivedUseCase)
    private readonly markArchivedUseCase: MarkNotificationArchivedUseCase,
    @Inject(GetUnreadCountUseCase) private readonly getUnreadCountUseCase: GetUnreadCountUseCase,
    @Inject(GetPreferencesUseCase) private readonly getPreferencesUseCase: GetPreferencesUseCase,
    @Inject(UpdatePreferencesUseCase)
    private readonly updatePreferencesUseCase: UpdatePreferencesUseCase,
    @Inject(CreateCampaignUseCase)
    private readonly createCampaignUseCase: CreateCampaignUseCase,
    @Inject(UpdateCampaignUseCase)
    private readonly updateCampaignUseCase: UpdateCampaignUseCase,
    @Inject(GetCampaignUseCase)
    private readonly getCampaignUseCase: GetCampaignUseCase,
    @Inject(ListCampaignsUseCase)
    private readonly listCampaignsUseCase: ListCampaignsUseCase,
    @Inject(ArchiveCampaignUseCase)
    private readonly archiveCampaignUseCase: ArchiveCampaignUseCase,
    @Inject(ScheduleCampaignUseCase)
    private readonly scheduleCampaignUseCase: ScheduleCampaignUseCase,
    @Inject(PreviewCampaignAudienceUseCase)
    private readonly previewCampaignAudienceUseCase: PreviewCampaignAudienceUseCase,
    @Inject(PreviewCampaignMessageUseCase)
    private readonly previewCampaignMessageUseCase: PreviewCampaignMessageUseCase,
  ) {}

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }
    return context;
  }

  @Post('/templates')
  async createNotificationTemplate(
    @Req() request: FastifyRequest,
    @Body() body: CreateNotificationTemplateInput,
  ) {
    return this.createTemplate.execute(this.requestContext(request), body);
  }

  @Get('/templates')
  async listNotificationTemplates(
    @Req() request: FastifyRequest,
    @Query('channel') channel?: 'EMAIL' | 'SMS' | 'IN_APP',
    @Query('status') status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
  ) {
    return this.listTemplates.execute(this.requestContext(request), { channel, status });
  }

  @Get('/templates/:templateId')
  async getNotificationTemplate(
    @Req() request: FastifyRequest,
    @Param('templateId') templateId: string,
  ) {
    return this.getTemplate.execute(this.requestContext(request), templateId);
  }

  @Post('/templates/:templateId/render')
  async renderNotificationTemplate(
    @Req() request: FastifyRequest,
    @Param('templateId') templateId: string,
    @Body() body: RenderNotificationTemplateInput,
  ) {
    return this.renderTemplateUseCase.execute(this.requestContext(request), templateId, body);
  }

  @Post('/templates/:templateId/archive')
  async archiveNotificationTemplate(
    @Req() request: FastifyRequest,
    @Param('templateId') templateId: string,
  ) {
    return this.archiveTemplate.execute(this.requestContext(request), templateId);
  }

  @Post('/intents')
  async createNotificationIntent(
    @Req() request: FastifyRequest,
    @Body() body: CreateNotificationIntentInput,
  ) {
    return this.createIntent.execute(this.requestContext(request), body);
  }

  @Get('/intents')
  async listNotificationIntents(
    @Req() request: FastifyRequest,
    @Query('channel') channel?: 'EMAIL' | 'SMS' | 'IN_APP',
    @Query('status') status?: 'DRAFT' | 'QUEUED' | 'DISPATCHED' | 'FAILED' | 'CANCELLED',
  ) {
    return this.listIntents.execute(this.requestContext(request), { channel, status });
  }

  @Get('/intents/:intentId')
  async getNotificationIntent(@Req() request: FastifyRequest, @Param('intentId') intentId: string) {
    return this.getIntent.execute(this.requestContext(request), intentId);
  }

  @Post('/intents/:intentId/mark-dispatched')
  async markNotificationIntentDispatched(
    @Req() request: FastifyRequest,
    @Param('intentId') intentId: string,
    @Body() body: MarkNotificationIntentDispatchedInput,
  ) {
    return this.markDispatched.execute(this.requestContext(request), intentId, body);
  }

  @Post('/intents/:intentId/mark-failed')
  async markNotificationIntentFailed(
    @Req() request: FastifyRequest,
    @Param('intentId') intentId: string,
    @Body() body: MarkNotificationIntentFailedInput,
  ) {
    return this.markFailed.execute(this.requestContext(request), intentId, body);
  }

  @Get('/notifications')
  async listNotifications(
    @Req() request: FastifyRequest,
    @Query('status') status?: 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED',
    @Query('limit') limit?: string,
  ) {
    const query: {
      status?: 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED';
      limit?: number;
    } = {};
    if (status !== undefined) {
      query.status = status;
    }
    if (limit !== undefined) {
      query.limit = parseInt(limit, 10);
    }
    return this.listNotificationsUseCase.execute(this.requestContext(request), query);
  }

  @Get('/notifications/unread-count')
  async getNotificationUnreadCount(@Req() request: FastifyRequest) {
    return this.getUnreadCountUseCase.execute(this.requestContext(request));
  }

  @Get('/notifications/:notificationId')
  async getNotification(
    @Req() request: FastifyRequest,
    @Param('notificationId') notificationId: string,
  ) {
    return this.getNotificationUseCase.execute(this.requestContext(request), notificationId);
  }

  @Post('/notifications/:notificationId/mark-read')
  async markNotificationRead(
    @Req() request: FastifyRequest,
    @Param('notificationId') notificationId: string,
  ) {
    return this.markReadUseCase.execute(this.requestContext(request), notificationId);
  }

  @Post('/notifications/:notificationId/mark-unread')
  async markNotificationUnread(
    @Req() request: FastifyRequest,
    @Param('notificationId') notificationId: string,
  ) {
    return this.markUnreadUseCase.execute(this.requestContext(request), notificationId);
  }

  @Post('/notifications/:notificationId/mark-archived')
  async markNotificationArchived(
    @Req() request: FastifyRequest,
    @Param('notificationId') notificationId: string,
  ) {
    return this.markArchivedUseCase.execute(this.requestContext(request), notificationId);
  }

  @Get('/preferences')
  async getNotificationPreferences(@Req() request: FastifyRequest) {
    return this.getPreferencesUseCase.execute(this.requestContext(request));
  }

  @Post('/preferences')
  async updateNotificationPreferences(
    @Req() request: FastifyRequest,
    @Body() body: UpdateNotificationPreferencesInput,
  ) {
    return this.updatePreferencesUseCase.execute(this.requestContext(request), body);
  }

  @Put('/preferences')
  async putNotificationPreferences(
    @Req() request: FastifyRequest,
    @Body() body: UpdateNotificationPreferencesInput,
  ) {
    return this.updatePreferencesUseCase.execute(this.requestContext(request), body);
  }

  @Post('/campaigns')
  async createCampaign(
    @Req() request: FastifyRequest,
    @Body() body: CreateCampaignRequestContract,
  ) {
    return this.createCampaignUseCase.execute(this.requestContext(request), body);
  }

  @Get('/campaigns')
  async listCampaigns(@Req() request: FastifyRequest) {
    return this.listCampaignsUseCase.execute(this.requestContext(request));
  }

  @Get('/campaigns/:campaignId')
  async getCampaign(@Req() request: FastifyRequest, @Param('campaignId') campaignId: string) {
    return this.getCampaignUseCase.execute(this.requestContext(request), campaignId);
  }

  @Patch('/campaigns/:campaignId')
  async updateCampaign(
    @Req() request: FastifyRequest,
    @Param('campaignId') campaignId: string,
    @Body() body: UpdateCampaignRequestContract,
  ) {
    return this.updateCampaignUseCase.execute(this.requestContext(request), campaignId, body);
  }

  @Delete('/campaigns/:campaignId')
  async deleteCampaign(@Req() request: FastifyRequest, @Param('campaignId') campaignId: string) {
    return this.archiveCampaignUseCase.execute(this.requestContext(request), campaignId);
  }

  @Post('/campaigns/:campaignId/archive')
  async archiveCampaign(@Req() request: FastifyRequest, @Param('campaignId') campaignId: string) {
    return this.archiveCampaignUseCase.execute(this.requestContext(request), campaignId);
  }

  @Post('/campaigns/:campaignId/schedule')
  async scheduleCampaign(
    @Req() request: FastifyRequest,
    @Param('campaignId') campaignId: string,
    @Body() body: ScheduleCampaignRequestContract,
  ) {
    return this.scheduleCampaignUseCase.execute(
      this.requestContext(request),
      campaignId,
      body.scheduledFor,
    );
  }

  @Post('/campaigns/preview-audience')
  async previewAudience(
    @Req() request: FastifyRequest,
    @Body() body: CampaignAudiencePreviewRequestContract,
  ) {
    return this.previewCampaignAudienceUseCase.execute(this.requestContext(request), body);
  }

  @Post('/campaigns/preview-message')
  async previewMessage(
    @Req() request: FastifyRequest,
    @Body() body: CampaignMessagePreviewRequestContract,
  ) {
    return this.previewCampaignMessageUseCase.execute(this.requestContext(request), body);
  }
}
