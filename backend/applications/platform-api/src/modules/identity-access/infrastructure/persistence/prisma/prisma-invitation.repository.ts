import { Injectable } from '@nestjs/common';
import { PrismaService, getPrismaClient } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { Invitation, InvitationRepository, InvitationStatus } from '../../../domain/index.js';
import { mapPrismaError } from '@mentrily/data-platform';
import { Invitation as PrismaInvitation } from '@prisma/client';

@Injectable()
export class PrismaInvitationRepository implements InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, transaction?: TransactionContext): Promise<Invitation | null> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const record = await client.invitation.findUnique({
        where: { id },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByToken(token: string, transaction?: TransactionContext): Promise<Invitation | null> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const record = await client.invitation.findUnique({
        where: { token },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findPendingByWorkspaceAndEmail(
    workspaceId: string,
    email: string,
    transaction?: TransactionContext,
  ): Promise<Invitation | null> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const record = await client.invitation.findFirst({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { email, workspaceId, status: InvitationStatus.PENDING as any },
      });
      return record ? this.mapToDomain(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async save(invitation: Invitation, transaction?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      await client.invitation.upsert({
        where: { id: invitation.id },
        update: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: invitation.status as any,
          acceptedAt: invitation.acceptedAt ?? null,
        },
        create: {
          id: invitation.id,
          email: invitation.email,
          workspaceId: invitation.workspaceId,
          roleKey: invitation.roleKey,
          inviterPrincipalId: invitation.inviterPrincipalId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: invitation.status as any,
          token: invitation.token,
          expiresAt: invitation.expiresAt,
          acceptedAt: invitation.acceptedAt ?? null,
        },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private mapToDomain(record: PrismaInvitation): Invitation {
    const invitation: Invitation = {
      id: record.id,
      email: record.email,
      workspaceId: record.workspaceId,
      roleKey: record.roleKey,
      inviterPrincipalId: record.inviterPrincipalId,
      status: record.status as InvitationStatus,
      token: record.token,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    if (record.acceptedAt) invitation.acceptedAt = record.acceptedAt;

    return invitation;
  }
}
