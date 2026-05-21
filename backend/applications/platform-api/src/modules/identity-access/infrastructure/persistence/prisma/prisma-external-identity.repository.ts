import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import {
  ExternalIdentity,
  ExternalIdentityRepository,
  ExternalProvider,
} from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';

import { ExternalIdentity as PrismaExternalIdentity } from '@prisma/client';

@Injectable()
export class PrismaExternalIdentityRepository implements ExternalIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByExternalId(
    provider: ExternalProvider,
    externalId: string,
  ): Promise<ExternalIdentity | null> {
    try {
      const record = await this.prisma.externalIdentity.findUnique({
        where: {
          provider_externalId: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            provider: provider as any,
            externalId,
          },
        },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(identity: ExternalIdentity): Promise<void> {
    try {
      await this.prisma.externalIdentity.upsert({
        where: {
          provider_externalId: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            provider: identity.provider as any,
            externalId: identity.externalId,
          },
        },
        update: {
          email: identity.email,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: identity.metadata as any,
        },
        create: {
          id: identity.id,
          principalId: identity.principalId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          provider: identity.provider as any,
          externalId: identity.externalId,
          email: identity.email,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: identity.metadata as any,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaExternalIdentity): ExternalIdentity {
    return {
      id: record.id,
      principalId: record.principalId,
      provider: record.provider as ExternalProvider,
      externalId: record.externalId,
      email: record.email,
      metadata: (record.metadata as Record<string, unknown>) ?? undefined,
      createdAt: record.createdAt,
    };
  }
}
