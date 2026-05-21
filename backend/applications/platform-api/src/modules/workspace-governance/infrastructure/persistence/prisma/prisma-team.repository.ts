import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import { Team, TeamRepository, WorkspaceId } from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';
import { Team as PrismaTeam } from '@prisma/client';

@Injectable()
export class PrismaTeamRepository implements TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Team | null> {
    try {
      const record = await this.prisma.team.findUnique({
        where: { id },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findAllByWorkspaceId(workspaceId: WorkspaceId): Promise<Team[]> {
    try {
      const records = await this.prisma.team.findMany({
        where: { workspaceId },
      });
      return records.map((record: PrismaTeam) => this.mapToDomain(record));
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(team: Team): Promise<void> {
    try {
      await this.prisma.team.upsert({
        where: { id: team.id },
        update: {
          name: team.name,
          description: team.description ?? null,
        },
        create: {
          id: team.id,
          workspaceId: team.workspaceId,
          name: team.name,
          description: team.description ?? null,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.team.delete({
        where: { id },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaTeam): Team {
    const team: Team = {
      id: record.id,
      workspaceId: record.workspaceId as WorkspaceId,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    if (record.description) team.description = record.description;

    return team;
  }
}
