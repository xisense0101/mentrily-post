import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { PrismaService } from '@mentrily/data-platform';
import type {
  MultiWorkspaceDashboardSummaryContract,
  DashboardSummaryContract,
} from '@mentrily/contract-catalog';
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
    });

    const workspaces: {
      workspaceId: string;
      workspaceName: string;
      workspaceSlug: string;
      summary: DashboardSummaryContract;
    }[] = [];

    for (const membership of memberships) {
      // Evaluate permission for this specific workspace
      const permission = await this.permissionEvaluator.evaluate(
        {
          permission: PermissionCatalog.DASHBOARD_READ,
          workspace: {
            tenantId: context.workspace?.tenantId || membership.workspaceId,
            workspaceId: membership.workspaceId,
            actorId,
          },
        },
        context,
      );

      if (permission.allowed) {
        const summary = await this.getDashboardSummary.computeSummary(membership.workspaceId);
        workspaces.push({
          workspaceId: membership.workspaceId,
          workspaceName: membership.workspace.name,
          workspaceSlug: membership.workspace.slug,
          summary,
        });
      }
    }

    return { workspaces };
  }
}
