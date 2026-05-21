import { Injectable } from '@nestjs/common';
import { PrismaService, getPrismaClient } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import {
  WorkspaceMember,
  WorkspaceMemberRepository,
  WorkspaceId,
  MembershipStatus,
} from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';

import { WorkspaceMember as PrismaWorkspaceMember } from '@prisma/client';

@Injectable()
export class PrismaWorkspaceMemberRepository implements WorkspaceMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, transaction?: TransactionContext): Promise<WorkspaceMember | null> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const record = await client.workspaceMember.findUnique({
        where: { id },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByWorkspaceAndPrincipal(
    workspaceId: WorkspaceId,
    principalId: string,
    transaction?: TransactionContext,
  ): Promise<WorkspaceMember | null> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const record = await client.workspaceMember.findUnique({
        where: {
          workspaceId_principalId: {
            workspaceId,
            principalId,
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
  ): Promise<WorkspaceMember[]> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const records = await client.workspaceMember.findMany({
        where: { workspaceId },
      });
      return records.map((record: PrismaWorkspaceMember) => this.mapToDomain(record));
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(member: WorkspaceMember, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      await client.workspaceMember.upsert({
        where: { id: member.id },
        update: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: member.status as any,
        },
        create: {
          id: member.id,
          workspaceId: member.workspaceId,
          principalId: member.principalId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: member.status as any,
          joinedAt: member.joinedAt,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async delete(id: string, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      await client.workspaceMember.delete({
        where: { id },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async assignRole(
    memberId: string,
    roleId: string,
    transaction?: TransactionContext,
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      await client.workspaceMemberRole.upsert({
        where: {
          memberId_roleId: {
            memberId,
            roleId,
          },
        },
        update: {},
        create: {
          memberId,
          roleId,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async getMemberRoles(memberId: string, transaction?: TransactionContext): Promise<string[]> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const roles = await client.workspaceMemberRole.findMany({
        where: { memberId },
        include: { role: true },
      });
      return roles.map((r) => r.role.key);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaWorkspaceMember): WorkspaceMember {
    return {
      id: record.id,
      workspaceId: record.workspaceId as WorkspaceId,
      principalId: record.principalId,
      status: record.status as MembershipStatus,
      joinedAt: record.joinedAt,
      createdAt: record.createdAt,
    };
  }
}
