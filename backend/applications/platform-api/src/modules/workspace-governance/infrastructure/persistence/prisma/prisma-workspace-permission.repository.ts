import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import { WorkspacePermission, WorkspacePermissionRepository } from '../../../domain/index.js';
import { PermissionKey } from '@mentrily/security-toolkit';
import { mapPrismaError } from '@mentrily/data-platform';
import { WorkspacePermission as PrismaWorkspacePermission } from '@prisma/client';

@Injectable()
export class PrismaWorkspacePermissionRepository implements WorkspacePermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByRoleId(roleId: string): Promise<WorkspacePermission[]> {
    try {
      const records = await this.prisma.workspacePermission.findMany({
        where: { roleId },
      });
      return records.map((record: PrismaWorkspacePermission) => this.mapToDomain(record));
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(permission: WorkspacePermission): Promise<void> {
    try {
      await this.prisma.workspacePermission.upsert({
        where: {
          roleId_key: {
            roleId: permission.roleId,
            key: permission.key.toString(),
          },
        },
        update: {},
        create: {
          id: permission.id,
          roleId: permission.roleId,
          key: permission.key.toString(),
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async delete(roleId: string, key: PermissionKey): Promise<void> {
    try {
      await this.prisma.workspacePermission.delete({
        where: {
          roleId_key: {
            roleId,
            key: key.toString(),
          },
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async deleteByRoleId(roleId: string): Promise<void> {
    try {
      await this.prisma.workspacePermission.deleteMany({
        where: { roleId },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaWorkspacePermission): WorkspacePermission {
    return {
      id: record.id,
      roleId: record.roleId,
      key: new PermissionKey(record.key),
      createdAt: record.createdAt,
    };
  }
}
