import { Injectable } from '@nestjs/common';
import { PrismaService, getPrismaClient } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { WorkspaceRole, WorkspaceRoleRepository, WorkspaceId } from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';

import { WorkspaceRole as PrismaWorkspaceRole } from '@prisma/client';

@Injectable()
export class PrismaWorkspaceRoleRepository implements WorkspaceRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, transaction?: TransactionContext): Promise<WorkspaceRole | null> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const record = await client.workspaceRole.findUnique({
        where: { id },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByKey(
    workspaceId: WorkspaceId,
    key: string,
    transaction?: TransactionContext,
  ): Promise<WorkspaceRole | null> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const record = await client.workspaceRole.findUnique({
        where: {
          workspaceId_key: {
            workspaceId,
            key,
          },
        },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findAllByWorkspaceId(
    workspaceId: WorkspaceId,
    transaction?: TransactionContext,
  ): Promise<WorkspaceRole[]> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const records = await client.workspaceRole.findMany({
        where: { workspaceId },
      });
      return records.map((record: PrismaWorkspaceRole) => this.mapToDomain(record));
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(role: WorkspaceRole, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      await client.workspaceRole.upsert({
        where: { id: role.id },
        update: {
          name: role.name,
          key: role.key,
        },
        create: {
          id: role.id,
          workspaceId: role.workspaceId,
          name: role.name,
          key: role.key,
          isSystem: role.isSystem,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async delete(id: string, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      await client.workspaceRole.delete({
        where: { id },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaWorkspaceRole): WorkspaceRole {
    return {
      id: record.id,
      workspaceId: record.workspaceId as WorkspaceId,
      name: record.name,
      key: record.key,
      isSystem: record.isSystem,
      createdAt: record.createdAt,
    };
  }
}
