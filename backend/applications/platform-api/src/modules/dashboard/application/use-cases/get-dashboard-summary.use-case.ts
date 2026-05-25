import { Inject, Injectable } from '@nestjs/common';
import type {
  DashboardActivityItemContract,
  DashboardSummaryContract,
} from '@mentrily/contract-catalog';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { AnalyticsDashboardReadModelService } from '../../../analytics/application/analytics-dashboard-read-model.service.js';

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(AnalyticsDashboardReadModelService)
    private readonly analyticsReadModel: AnalyticsDashboardReadModelService,
  ) {}

  async execute(context: RequestContext): Promise<{
    summary: DashboardSummaryContract;
    recentActivity: DashboardActivityItemContract[];
  }> {
    const workspace = await this.assertDashboardAccess(context);

    return {
      summary: await this.computeSummary(workspace.workspaceId),
      recentActivity: await this.getRecentActivity(workspace.workspaceId),
    };
  }

  async assertDashboardAccess(
    context: RequestContext,
  ): Promise<NonNullable<RequestContext['workspace']>> {
    const workspace = context.workspace;
    if (!workspace) {
      throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
    }

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.DASHBOARD_READ, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return workspace;
  }

  async computeSummary(workspaceId: string): Promise<DashboardSummaryContract> {
    return this.analyticsReadModel.getCreatorDashboardSummary(workspaceId);
  }

  private async getRecentActivity(workspaceId: string): Promise<DashboardActivityItemContract[]> {
    return this.analyticsReadModel.getRecentActivity(workspaceId, 10);
  }
}
