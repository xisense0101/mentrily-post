import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import {
  ServiceCredential,
  ServiceCredentialRepository,
  ServiceCredentialStatus,
} from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';
import { ServiceCredential as PrismaServiceCredential } from '@prisma/client';

@Injectable()
export class PrismaServiceCredentialRepository implements ServiceCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ServiceCredential | null> {
    try {
      const record = await this.prisma.serviceCredential.findUnique({
        where: { id },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByKeyId(keyId: string): Promise<ServiceCredential | null> {
    try {
      const record = await this.prisma.serviceCredential.findUnique({
        where: { keyId },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(credential: ServiceCredential): Promise<void> {
    try {
      await this.prisma.serviceCredential.upsert({
        where: { id: credential.id },
        update: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: credential.status as any,
          lastUsedAt: credential.lastUsedAt ?? null,
        },
        create: {
          id: credential.id,
          principalId: credential.principalId,
          keyId: credential.keyId,
          secretHash: credential.secretHash,
          description: credential.description ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: credential.status as any,
          expiresAt: credential.expiresAt ?? null,
          lastUsedAt: credential.lastUsedAt ?? null,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaServiceCredential): ServiceCredential {
    const credential: ServiceCredential = {
      id: record.id,
      principalId: record.principalId,
      keyId: record.keyId,
      secretHash: record.secretHash,
      status: record.status as ServiceCredentialStatus,
      createdAt: record.createdAt,
    };

    if (record.description) credential.description = record.description;
    if (record.expiresAt) credential.expiresAt = record.expiresAt;
    if (record.lastUsedAt) credential.lastUsedAt = record.lastUsedAt;

    return credential;
  }
}
