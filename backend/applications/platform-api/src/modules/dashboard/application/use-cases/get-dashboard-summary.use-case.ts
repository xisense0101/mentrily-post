import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
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

    return {
      summary: await this.computeSummary(workspace.workspaceId),
      recentActivity: await this.getRecentActivity(workspace.workspaceId),
    };
  }

  async computeSummary(workspaceId: string): Promise<DashboardSummaryContract> {
    const [
      totalCourses,
      totalPublishedCourses,
      totalAssessments,
      totalActiveAssessments,
      pendingGradingCount,
      contentDocumentsCount,
      mediaAssetsCount,
      failedQuarantinedMediaCount,
      campaignsCount,
    ] = await Promise.all([
      this.prisma.learningCourse.count({ where: { workspaceId } }),
      this.prisma.learningCourse.count({ where: { workspaceId, status: 'PUBLISHED' } }),
      this.prisma.assessment.count({ where: { workspaceId } }),
      this.prisma.assessment.count({ where: { workspaceId, status: 'PUBLISHED' } }),
      this.prisma.assessmentAttemptResult.count({
        where: {
          gradingStatus: 'PENDING_MANUAL_REVIEW',
          attempt: { workspaceId },
        },
      }),
      this.prisma.contentDocument.count({ where: { workspaceId } }),
      this.prisma.mediaAsset.count({ where: { workspaceId } }),
      this.prisma.mediaAsset.count({
        where: {
          workspaceId,
          OR: [
            { status: { in: ['FAILED', 'PROCESSING_FAILED'] } },
            { scanStatus: { in: ['INFECTED', 'QUARANTINED', 'SCAN_FAILED', 'SUSPICIOUS'] } },
          ],
        },
      }),
      this.prisma.campaign.count({
        where: {
          workspaceId,
          status: { not: 'ARCHIVED' },
        },
      }),
    ]);

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

    return auditRecords.map((record) => ({
      id: record.id,
      type: record.action,
      title: toActivityTitle(record.action),
      description: toActivityDescription(record.action, record.targetType),
      occurredAt: record.occurredAt.toISOString(),
    }));
  }
}

function toActivityTitle(action: string): string {
  switch (action) {
    case 'learning.course.created':
      return 'Course Created';
    case 'learning.course.published':
      return 'Course Published';
    case 'media.asset.uploaded':
    case 'media.asset.created':
      return 'Media Uploaded';
    case 'assessment.created':
      return 'Assessment Created';
    case 'assessment.attempt.submitted':
      return 'Assessment Submitted';
    case 'campaign.created':
      return 'Campaign Created';
    default:
      return action;
  }
}

function toActivityDescription(action: string, targetType: string): string {
  switch (action) {
    case 'learning.course.created':
      return 'A new learning course was created.';
    case 'learning.course.published':
      return 'A learning course was published.';
    case 'media.asset.uploaded':
    case 'media.asset.created':
      return 'A new media asset was uploaded.';
    case 'assessment.created':
      return 'A new assessment was created.';
    case 'assessment.attempt.submitted':
      return 'An assessment attempt was submitted by a learner.';
    case 'campaign.created':
      return 'A campaign draft was created.';
    default:
      return `Action on ${targetType}`;
  }
}
