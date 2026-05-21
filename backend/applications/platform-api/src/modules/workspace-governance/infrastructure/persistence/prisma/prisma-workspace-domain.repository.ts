import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import {
  WorkspaceDomain,
  WorkspaceDomainRepository,
  WorkspaceId,
  WorkspaceDomainStatus,
} from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';
import { WorkspaceDomain as PrismaWorkspaceDomain } from '@prisma/client';

@Injectable()
export class PrismaWorkspaceDomainRepository implements WorkspaceDomainRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<WorkspaceDomain | null> {
    try {
      const record = await this.prisma.workspaceDomain.findUnique({
        where: { id },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByDomain(domain: string): Promise<WorkspaceDomain | null> {
    try {
      const record = await this.prisma.workspaceDomain.findUnique({
        where: { domain },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findAllByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceDomain[]> {
    try {
      const records = await this.prisma.workspaceDomain.findMany({
        where: { workspaceId },
      });
      return records.map((record: PrismaWorkspaceDomain) => this.mapToDomain(record));
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(workspaceDomain: WorkspaceDomain): Promise<void> {
    try {
      await this.prisma.workspaceDomain.upsert({
        where: { id: workspaceDomain.id },
        update: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: workspaceDomain.status as any,
          verifiedAt: workspaceDomain.verifiedAt ?? null,
        },
        create: {
          id: workspaceDomain.id,
          workspaceId: workspaceDomain.workspaceId,
          domain: workspaceDomain.domain,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: workspaceDomain.status as any,
          verificationToken: workspaceDomain.verificationToken,
          verifiedAt: workspaceDomain.verifiedAt ?? null,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.workspaceDomain.delete({
        where: { id },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaWorkspaceDomain): WorkspaceDomain {
    const domain: WorkspaceDomain = {
      id: record.id,
      workspaceId: record.workspaceId as WorkspaceId,
      domain: record.domain,
      status: record.status as WorkspaceDomainStatus,
      verificationToken: record.verificationToken,
      createdAt: record.createdAt,
    };

    if (record.verifiedAt) domain.verifiedAt = record.verifiedAt;

    return domain;
  }
}
