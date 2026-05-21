import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import { AccessSession, AccessSessionRepository } from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';
import { AccessSession as PrismaAccessSession } from '@prisma/client';

@Injectable()
export class PrismaAccessSessionRepository implements AccessSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AccessSession | null> {
    try {
      const record = await this.prisma.accessSession.findUnique({
        where: { id },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(session: AccessSession): Promise<void> {
    try {
      await this.prisma.accessSession.upsert({
        where: { id: session.id },
        update: {
          expiresAt: session.expiresAt,
        },
        create: {
          id: session.id,
          principalId: session.principalId,
          userAgent: session.userAgent ?? null,
          ipAddress: session.ipAddress ?? null,
          expiresAt: session.expiresAt,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.accessSession.delete({
        where: { id },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaAccessSession): AccessSession {
    const session: AccessSession = {
      id: record.id,
      principalId: record.principalId,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    };

    if (record.userAgent) session.userAgent = record.userAgent;
    if (record.ipAddress) session.ipAddress = record.ipAddress;

    return session;
  }
}
