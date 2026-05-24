import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, RequestContext } from '@mentrily/service-core';
import {
  GetDashboardSummaryUseCase,
  GetMultiWorkspaceDashboardUseCase,
} from '../../application/index.js';

@Controller('/workspace/dashboard')
export class IntelligenceController {
  constructor(
    @Inject(GetDashboardSummaryUseCase)
    private readonly getDashboardSummary: GetDashboardSummaryUseCase,
    @Inject(GetMultiWorkspaceDashboardUseCase)
    private readonly getMultiWorkspaceDashboard: GetMultiWorkspaceDashboardUseCase,
  ) {}

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }
    return context;
  }

  @Get('/')
  async getSummary(@Req() request: FastifyRequest) {
    return this.getDashboardSummary.execute(this.requestContext(request));
  }

  @Get('/multi')
  async getMultiSummary(@Req() request: FastifyRequest) {
    return this.getMultiWorkspaceDashboard.execute(this.requestContext(request));
  }
}
