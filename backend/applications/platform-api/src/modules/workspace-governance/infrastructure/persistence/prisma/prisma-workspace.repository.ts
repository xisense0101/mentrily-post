import { Injectable } from '@nestjs/common';
import { PrismaService, getPrismaClient } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import {
  Workspace,
  WorkspaceRepository,
  WorkspaceId,
  WorkspaceSlug,
  WorkspaceStatus,
} from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';
import { Workspace as PrismaWorkspace } from '@prisma/client';

@Injectable()
export class PrismaWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: WorkspaceId, transaction?: TransactionContext): Promise<Workspace | null> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const record = await client.workspace.findUnique({
        where: { id, deletedAt: null },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findBySlug(
    slug: WorkspaceSlug,
    transaction?: TransactionContext,
  ): Promise<Workspace | null> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const record = await client.workspace.findUnique({
        where: { slug: slug.toString(), deletedAt: null },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(workspace: Workspace, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      await client.workspace.upsert({
        where: { id: workspace.id },
        update: {
          name: workspace.name,
          slug: workspace.slug.toString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: workspace.status as any,
        },
        create: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug.toString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: workspace.status as any,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaWorkspace): Workspace {
    return {
      id: record.id as WorkspaceId,
      name: record.name,
      slug: new WorkspaceSlug(record.slug),
      status: record.status as WorkspaceStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
