import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, type RequestContext } from '@mentrily/service-core';
import {
  GetDashboardSummaryUseCase,
  GetMultiWorkspaceDashboardUseCase,
} from '../../application/use-cases/index.js';

@Controller('/workspace/dashboard')
export class DashboardController {
  constructor(
    @Inject(GetDashboardSummaryUseCase)
    private readonly getDashboardSummary: GetDashboardSummaryUseCase,
    @Inject(GetMultiWorkspaceDashboardUseCase)
    private readonly getMultiWorkspaceDashboard: GetMultiWorkspaceDashboardUseCase,
  ) {}

  @Get()
  async getSummary(@Req() request: FastifyRequest) {
    return this.getDashboardSummary.execute(this.requestContext(request));
  }

  @Get('/multi')
  async getMultiSummary(@Req() request: FastifyRequest) {
    return this.getMultiWorkspaceDashboard.execute(this.requestContext(request));
  }

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }
    return context;
  }
}
