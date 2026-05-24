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
  DashboardSummaryContract,
  DashboardActivityItemContract,
} from '@mentrily/contract-catalog';

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
  ): Promise<{
    summary: DashboardSummaryContract;
    recentActivity: DashboardActivityItemContract[];
  }> {
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

    const summary = await this.computeSummary(workspace.workspaceId);
    const recentActivity = await this.getRecentActivity(workspace.workspaceId);

    return { summary, recentActivity };
  }

  async computeSummary(workspaceId: string): Promise<DashboardSummaryContract> {
    const totalCourses = await this.prisma.learningCourse.count({
      where: { workspaceId },
    });

    const totalPublishedCourses = await this.prisma.learningCourse.count({
      where: { workspaceId, status: 'PUBLISHED' },
    });

    const totalAssessments = await this.prisma.assessment.count({
      where: { workspaceId },
    });

    const totalActiveAssessments = await this.prisma.assessment.count({
      where: { workspaceId, status: 'PUBLISHED' },
    });

    const pendingGradingCount = await this.prisma.assessmentAttemptResult.count({
      where: {
        gradingStatus: 'PENDING_MANUAL_REVIEW',
        attempt: { workspaceId },
      },
    });

    const contentDocumentsCount = await this.prisma.contentDocument.count({
      where: { workspaceId },
    });

    const mediaAssetsCount = await this.prisma.mediaAsset.count({
      where: { workspaceId },
    });

    const failedQuarantinedMediaCount = await this.prisma.mediaAsset.count({
      where: {
        workspaceId,
        OR: [
          { status: { in: ['FAILED', 'PROCESSING_FAILED'] } },
          { scanStatus: { in: ['INFECTED', 'QUARANTINED', 'SCAN_FAILED', 'SUSPICIOUS'] } },
        ],
      },
    });

    const campaignsCount = await this.prisma.campaign.count({
      where: {
        workspaceId,
        status: { not: 'ARCHIVED' },
      },
    });

    return {
      workspaceId,
      totalCourses,
      totalPublishedCourses,
      totalAssessments,
      totalActiveAssessments,
      pendingGradingCount,
      contentDocumentsCount,
      mediaAssetsCount,
      failedQuarantinedMediaCount,
      campaignsCount,
    };
  }

  private async getRecentActivity(workspaceId: string): Promise<DashboardActivityItemContract[]> {
    const auditRecords = await this.prisma.auditRecord.findMany({
      where: { workspaceId },
      orderBy: { occurredAt: 'desc' },
      take: 10,
    });

    return auditRecords.map((record) => {
      let title = record.action;
      let description = `Action on ${record.targetType}`;

      if (record.action === 'learning.course.created') {
        title = 'Course Created';
        description = 'A new learning course was created.';
      } else if (record.action === 'learning.course.published') {
        title = 'Course Published';
        description = 'A learning course was published.';
      } else if (
        record.action === 'media.asset.uploaded' ||
        record.action === 'media.asset.created'
      ) {
        title = 'Media Uploaded';
        description = 'A new media asset was uploaded.';
      } else if (record.action === 'assessment.created') {
        title = 'Assessment Created';
        description = 'A new assessment was created.';
      } else if (record.action === 'assessment.attempt.submitted') {
        title = 'Assessment Submitted';
        description = 'An assessment attempt was submitted by a learner.';
      } else if (record.action === 'campaign.created') {
        title = 'Campaign Created';
        description = 'A campaign was created.';
      }

      return {
        id: record.id,
        type: record.action,
        title,
        description,
        occurredAt: record.occurredAt.toISOString(),
      };
    });
  }
}
