import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import type {
  DashboardSummaryContract,
  MultiWorkspaceDashboardSummaryContract,
} from '@mentrily/contract-catalog';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { GetDashboardSummaryUseCase } from './get-dashboard-summary.use-case.js';

@Injectable()
export class GetMultiWorkspaceDashboardUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(GetDashboardSummaryUseCase)
    private readonly getDashboardSummary: GetDashboardSummaryUseCase,
  ) {}

  async execute(context: RequestContext): Promise<MultiWorkspaceDashboardSummaryContract> {
    const actorId = context.workspace?.actorId;
    if (!actorId) {
      throw new AppError('UNAUTHORIZED', 'missing actor', 401);
    }

    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        principalId: actorId,
        status: 'ACTIVE',
      },
      include: {
        workspace: true,
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    const workspaces: Array<{
      workspaceId: string;
      workspaceName: string;
      workspaceSlug: string;
      summary: DashboardSummaryContract;
    }> = [];

    for (const membership of memberships) {
      // In this product model tenantId = workspaceId (workspace is the tenant boundary).
      // Derive tenantId from the original request context rather than duplicating workspaceId.
      const workspaceContext = {
        tenantId: context.workspace?.tenantId ?? membership.workspaceId,
        workspaceId: membership.workspaceId,
        actorId,
      };

      const permission = await this.permissionEvaluator.evaluate(
        { permission: PermissionCatalog.DASHBOARD_READ, workspace: workspaceContext },
        { ...context, workspace: workspaceContext },
      );

      if (!permission.allowed) {
        continue;
      }

      workspaces.push({
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        workspaceSlug: membership.workspace.slug,
        summary: await this.getDashboardSummary.computeSummary(membership.workspaceId),
      });
    }

    return { workspaces };
  }
}
