import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import {
  Principal,
  PrincipalRepository,
  PrincipalId,
  PrincipalStatus,
} from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';
import { Principal as PrismaPrincipal } from '@prisma/client';

@Injectable()
export class PrismaPrincipalRepository implements PrincipalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: PrincipalId): Promise<Principal | null> {
    try {
      const record = await this.prisma.principal.findUnique({
        where: { id, deletedAt: null },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByEmail(email: string): Promise<Principal | null> {
    try {
      const record = await this.prisma.principal.findUnique({
        where: { email, deletedAt: null },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(principal: Principal): Promise<void> {
    try {
      await this.prisma.principal.upsert({
        where: { id: principal.id },
        update: {
          email: principal.email,
          displayName: principal.displayName ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: principal.status as any,
        },
        create: {
          id: principal.id,
          email: principal.email,
          displayName: principal.displayName ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: principal.status as any,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaPrincipal): Principal {
    const principal: Principal = {
      id: record.id,
      email: record.email,
      status: record.status as PrincipalStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    if (record.displayName) principal.displayName = record.displayName;

    return principal;
  }
}
