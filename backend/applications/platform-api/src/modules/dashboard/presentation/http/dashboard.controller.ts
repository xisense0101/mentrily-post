import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, type RequestContext } from '@mentrily/service-core';
import {
  GetDashboardSummaryUseCase,
  GetMultiWorkspaceDashboardUseCase,
} from '../../application/use-cases/index.js';
import { AnalyticsDashboardReadModelService } from '../../../analytics/application/analytics-dashboard-read-model.service.js';

@Controller('/workspace/dashboard')
export class DashboardController {
  constructor(
    @Inject(GetDashboardSummaryUseCase)
    private readonly getDashboardSummary: GetDashboardSummaryUseCase,
    @Inject(GetMultiWorkspaceDashboardUseCase)
    private readonly getMultiWorkspaceDashboard: GetMultiWorkspaceDashboardUseCase,
    @Inject(AnalyticsDashboardReadModelService)
    private readonly analyticsReadModel: AnalyticsDashboardReadModelService,
  ) {}

  @Get()
  async getSummary(@Req() request: FastifyRequest) {
    return this.getDashboardSummary.execute(this.requestContext(request));
  }

  @Get('/multi')
  async getMultiSummary(@Req() request: FastifyRequest) {
    return this.getMultiWorkspaceDashboard.execute(this.requestContext(request));
  }

  @Get('/creator/summary')
  async getCreatorSummary(@Req() request: FastifyRequest) {
    const context = this.requestContext(request);
    await this.getDashboardSummary.assertDashboardAccess(context);
    return this.getDashboardSummary.computeSummary(this.requireWorkspaceId(context));
  }

  @Get('/creator/activity')
  async getCreatorActivity(@Req() request: FastifyRequest) {
    const context = this.requestContext(request);
    await this.getDashboardSummary.assertDashboardAccess(context);
    return this.analyticsReadModel.getRecentActivity(this.requireWorkspaceId(context), 10);
  }

  @Get('/creator/metrics/learning')
  async getLearningMetrics(@Req() request: FastifyRequest) {
    const context = this.requestContext(request);
    await this.getDashboardSummary.assertDashboardAccess(context);
    return this.analyticsReadModel.getLearningMetrics(this.requireWorkspaceId(context));
  }

  @Get('/creator/metrics/assessment')
  async getAssessmentMetrics(@Req() request: FastifyRequest) {
    const context = this.requestContext(request);
    await this.getDashboardSummary.assertDashboardAccess(context);
    return this.analyticsReadModel.getAssessmentMetrics(this.requireWorkspaceId(context));
  }

  @Get('/creator/metrics/content')
  async getContentMetrics(@Req() request: FastifyRequest) {
    const context = this.requestContext(request);
    await this.getDashboardSummary.assertDashboardAccess(context);
    return this.analyticsReadModel.getContentMetrics(this.requireWorkspaceId(context));
  }

  @Get('/creator/metrics/media')
  async getMediaMetrics(@Req() request: FastifyRequest) {
    const context = this.requestContext(request);
    await this.getDashboardSummary.assertDashboardAccess(context);
    return this.analyticsReadModel.getMediaMetrics(this.requireWorkspaceId(context));
  }

  @Get('/creator/metrics/communication')
  async getCommunicationMetrics(@Req() request: FastifyRequest) {
    const context = this.requestContext(request);
    await this.getDashboardSummary.assertDashboardAccess(context);
    return this.analyticsReadModel.getCommunicationMetrics(this.requireWorkspaceId(context));
  }

  @Get('/creator/metrics/campaigns')
  async getCampaignMetrics(@Req() request: FastifyRequest) {
    const context = this.requestContext(request);
    await this.getDashboardSummary.assertDashboardAccess(context);
    return this.analyticsReadModel.getCampaignMetrics(this.requireWorkspaceId(context));
  }

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }
    return context;
  }

  private requireWorkspaceId(context: RequestContext): string {
    const workspaceId = context.workspace?.workspaceId;
    if (!workspaceId) {
      throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
    }
    return workspaceId;
  }
}
