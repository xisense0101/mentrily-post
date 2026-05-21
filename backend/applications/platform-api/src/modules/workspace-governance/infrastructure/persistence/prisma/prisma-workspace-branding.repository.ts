import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import {
  WorkspaceBranding,
  WorkspaceBrandingRepository,
  WorkspaceId,
} from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';
import { WorkspaceBranding as PrismaWorkspaceBranding } from '@prisma/client';

@Injectable()
export class PrismaWorkspaceBrandingRepository implements WorkspaceBrandingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceBranding | null> {
    try {
      const record = await this.prisma.workspaceBranding.findUnique({
        where: { workspaceId },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(branding: WorkspaceBranding): Promise<void> {
    try {
      await this.prisma.workspaceBranding.upsert({
        where: { workspaceId: branding.workspaceId },
        update: {
          logoUrl: branding.logoUrl ?? null,
          faviconUrl: branding.faviconUrl ?? null,
          primaryColor: branding.primaryColor ?? null,
          accentColor: branding.accentColor ?? null,
          customDomain: branding.customDomain ?? null,
        },
        create: {
          id: branding.id,
          workspaceId: branding.workspaceId,
          logoUrl: branding.logoUrl ?? null,
          faviconUrl: branding.faviconUrl ?? null,
          primaryColor: branding.primaryColor ?? null,
          accentColor: branding.accentColor ?? null,
          customDomain: branding.customDomain ?? null,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaWorkspaceBranding): WorkspaceBranding {
    const branding: WorkspaceBranding = {
      id: record.id,
      workspaceId: record.workspaceId as WorkspaceId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    if (record.logoUrl) branding.logoUrl = record.logoUrl;
    if (record.faviconUrl) branding.faviconUrl = record.faviconUrl;
    if (record.primaryColor) branding.primaryColor = record.primaryColor;
    if (record.accentColor) branding.accentColor = record.accentColor;
    if (record.customDomain) branding.customDomain = record.customDomain;

    return branding;
  }
}
