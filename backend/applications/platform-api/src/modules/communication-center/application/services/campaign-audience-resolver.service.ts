import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@mentrily/data-platform';
import type { CampaignAudiencePreviewRecipientContract } from '@mentrily/contract-catalog';

@Injectable()
export class CampaignAudienceResolver {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolve(
    workspaceId: string,
    audienceType: string,
    audienceConfig?: Record<string, unknown>,
  ): Promise<CampaignAudiencePreviewRecipientContract[]> {
    const config = audienceConfig || {};
    let members: WorkspaceMemberWithPrincipal[] = [];

    if (audienceType === 'ALL_WORKSPACE_MEMBERS') {
      members = await this.prisma.workspaceMember.findMany({
        where: { workspaceId, status: 'ACTIVE' },
        include: { principal: true, roles: { include: { role: true } } },
      });
    } else if (audienceType === 'WORKSPACE_ADMINS') {
      members = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          status: 'ACTIVE',
          roles: {
            some: {
              role: {
                key: { in: ['workspace_owner', 'workspace_admin'] },
              },
            },
          },
        },
        include: { principal: true, roles: { include: { role: true } } },
      });
    } else if (audienceType === 'COURSE_LEARNERS') {
      const courseId = typeof config.courseId === 'string' ? config.courseId : undefined;
      const enrollments = await this.prisma.learningEnrollment.findMany({
        where: {
          workspaceId,
          status: 'ACTIVE',
          ...(courseId ? { courseId } : {}),
        },
        select: { learnerPrincipalId: true },
      });
      const learnerIds = enrollments.map((enrollment) => enrollment.learnerPrincipalId);
      members = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          principalId: { in: learnerIds },
          status: 'ACTIVE',
        },
        include: { principal: true, roles: { include: { role: true } } },
      });
    } else if (audienceType === 'ASSESSMENT_PARTICIPANTS') {
      const assessmentId =
        typeof config.assessmentId === 'string' ? config.assessmentId : undefined;
      const attempts = await this.prisma.assessmentAttempt.findMany({
        where: {
          workspaceId,
          ...(assessmentId ? { assessmentId } : {}),
        },
        select: { learnerPrincipalId: true },
      });
      const participantIds = [...new Set(attempts.map((attempt) => attempt.learnerPrincipalId))];
      members = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          principalId: { in: participantIds },
          status: 'ACTIVE',
        },
        include: { principal: true, roles: { include: { role: true } } },
      });
    } else if (audienceType === 'CONTENT_AUTHORS') {
      members = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          status: 'ACTIVE',
          roles: {
            some: {
              role: {
                key: 'creator',
              },
            },
          },
        },
        include: { principal: true, roles: { include: { role: true } } },
      });
    } else if (audienceType === 'MEDIA_OWNERS') {
      const media = await this.prisma.mediaAsset.findMany({
        where: { workspaceId },
        select: { ownerPrincipalId: true },
      });
      const ownerIds = [...new Set(media.map((asset) => asset.ownerPrincipalId))];
      members = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          principalId: { in: ownerIds },
          status: 'ACTIVE',
        },
        include: { principal: true, roles: { include: { role: true } } },
      });
    } else if (audienceType === 'CUSTOM_USER_IDS') {
      const userIds = Array.isArray(config.userIds)
        ? config.userIds.filter((value): value is string => typeof value === 'string')
        : [];
      members = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          principalId: { in: userIds },
          status: 'ACTIVE',
        },
        include: { principal: true, roles: { include: { role: true } } },
      });
    }

    return members.map((member) => {
      const principal = member.principal;
      const role = member.roles.map((memberRole) => memberRole.role.key).join(', ') || 'learner';
      return {
        userId: principal.id,
        displayName: principal.displayName || principal.email,
        email: maskEmail(principal.email),
        role,
      };
    });
  }
}

type WorkspaceMemberWithPrincipal = Prisma.WorkspaceMemberGetPayload<{
  include: {
    principal: true;
    roles: {
      include: {
        role: true;
      };
    };
  };
}>;

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return '';
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? '*'}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}
