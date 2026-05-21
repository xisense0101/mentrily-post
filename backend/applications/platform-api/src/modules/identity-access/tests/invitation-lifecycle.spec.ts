import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateWorkspaceInvitation } from '../application/use-cases/create-workspace-invitation.use-case.js';
import { AcceptWorkspaceInvitation } from '../application/use-cases/accept-workspace-invitation.use-case.js';
import { RevokeWorkspaceInvitation } from '../application/use-cases/revoke-workspace-invitation.use-case.js';
import { RequestContext } from '@mentrily/service-core';
import { createPrismaMock } from './prisma-mock.js';
import { PrismaInvitationRepository } from '../infrastructure/persistence/prisma/prisma-invitation.repository.js';
import { PrismaWorkspaceMemberRepository } from '../../workspace-governance/infrastructure/persistence/prisma/prisma-workspace-member.repository.js';
import { PrismaWorkspaceRoleRepository } from '../../workspace-governance/infrastructure/persistence/prisma/prisma-workspace-role.repository.js';

describe('Invitation Lifecycle', () => {
  let prismaMock: any;
  let invitationRepo: PrismaInvitationRepository;
  let memberRepo: PrismaWorkspaceMemberRepository;
  let roleRepo: PrismaWorkspaceRoleRepository;
  const mockAudit = { record: vi.fn() };
  const mockOutbox = { publish: vi.fn() };
  const mockTransactionRunner = {
    run: vi.fn(async (operation: any) =>
      operation({
        transactionId: 'tx-test',
        client: prismaMock,
      }),
    ),
  };

  const mockContext: RequestContext = {
    requestId: 'req-1',
    correlationId: 'cor-1',
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    prismaMock = createPrismaMock();
    invitationRepo = new PrismaInvitationRepository(prismaMock as any);
    memberRepo = new PrismaWorkspaceMemberRepository(prismaMock as any);
    roleRepo = new PrismaWorkspaceRoleRepository(prismaMock as any);
    mockTransactionRunner.run.mockClear();
    mockAudit.record.mockReset();
    mockOutbox.publish.mockReset();
  });

  describe('CreateWorkspaceInvitation', () => {
    it('should create a pending invitation', async () => {
      const useCase = new CreateWorkspaceInvitation(
        invitationRepo,
        mockAudit as any,
        mockOutbox as any,
        mockTransactionRunner as any,
      );

      prismaMock.invitation.findFirst.mockResolvedValue(null);

      const input = {
        workspaceId: 'workspace-uuid',
        email: 'invite@test.com',
        roleKey: 'member',
        inviterPrincipalId: 'inviter-uuid',
      };

      const invitationId = await useCase.execute(input, mockContext);

      expect(invitationId).toBeDefined();
      expect(prismaMock.invitation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            email: 'invite@test.com',
            status: 'PENDING',
          }),
        }),
      );
      expect(mockTransactionRunner.run).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.anything(),
        mockContext,
        expect.anything(),
      );
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        expect.anything(),
        mockContext,
        expect.anything(),
      );
    });

    it('should prevent duplicate pending invitations', async () => {
      const useCase = new CreateWorkspaceInvitation(
        invitationRepo,
        mockAudit as any,
        mockOutbox as any,
        mockTransactionRunner as any,
      );

      prismaMock.invitation.findFirst.mockResolvedValue({
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 100000),
      });

      const input = {
        workspaceId: 'workspace-uuid',
        email: 'invite@test.com',
        roleKey: 'member',
        inviterPrincipalId: 'inviter-uuid',
      };

      await expect(useCase.execute(input, mockContext)).rejects.toThrow(
        'A pending invitation already exists',
      );
      expect(mockTransactionRunner.run).not.toHaveBeenCalled();
    });
  });

  describe('AcceptWorkspaceInvitation', () => {
    it('should accept a pending invitation and propagate transaction', async () => {
      const useCase = new AcceptWorkspaceInvitation(
        invitationRepo,
        memberRepo,
        roleRepo,
        mockAudit as any,
        mockOutbox as any,
        mockTransactionRunner as any,
      );

      const mockInvitation = {
        id: 'invite-uuid',
        workspaceId: 'workspace-uuid',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 100000),
        roleKey: 'admin',
      };

      prismaMock.invitation.findUnique.mockResolvedValue(mockInvitation);
      prismaMock.workspaceRole.findUnique.mockResolvedValue({ id: 'role-admin', key: 'admin' });

      await useCase.execute(
        {
          invitationId: 'invite-uuid',
          principalId: 'accepted-principal-uuid',
        },
        mockContext,
      );

      expect(mockTransactionRunner.run).toHaveBeenCalledTimes(1);
      expect(prismaMock.invitation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: 'ACCEPTED',
          }),
        }),
      );
      expect(prismaMock.workspaceMember.upsert).toHaveBeenCalled();
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.anything(),
        mockContext,
        expect.anything(),
      );
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        expect.anything(),
        mockContext,
        expect.anything(),
      );
    });

    it('should throw if invited role is missing and rollback', async () => {
      const useCase = new AcceptWorkspaceInvitation(
        invitationRepo,
        memberRepo,
        roleRepo,
        mockAudit as any,
        mockOutbox as any,
        mockTransactionRunner as any,
      );

      prismaMock.invitation.findUnique.mockResolvedValue({
        id: 'invite-uuid',
        workspaceId: 'workspace-uuid',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 100000),
        roleKey: 'missing-role',
      });
      prismaMock.workspaceRole.findUnique.mockResolvedValue(null);

      await expect(
        useCase.execute(
          {
            invitationId: 'invite-uuid',
            principalId: 'accepted-principal-uuid',
          },
          mockContext,
        ),
      ).rejects.toThrow('Invited role missing-role not found');

      expect(prismaMock.invitation.upsert).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('should reuse existing member idempotently', async () => {
      const useCase = new AcceptWorkspaceInvitation(
        invitationRepo,
        memberRepo,
        roleRepo,
        mockAudit as any,
        mockOutbox as any,
        mockTransactionRunner as any,
      );

      prismaMock.invitation.findUnique.mockResolvedValue({
        id: 'invite-uuid',
        workspaceId: 'workspace-uuid',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 100000),
        roleKey: 'admin',
      });
      prismaMock.workspaceMember.findUnique.mockResolvedValue({
        id: 'existing-member',
        workspaceId: 'workspace-uuid',
        principalId: 'accepted-principal-uuid',
      });
      prismaMock.workspaceRole.findUnique.mockResolvedValue({ id: 'role-admin', key: 'admin' });

      await useCase.execute(
        {
          invitationId: 'invite-uuid',
          principalId: 'accepted-principal-uuid',
        },
        mockContext,
      );

      expect(prismaMock.workspaceMember.upsert).not.toHaveBeenCalled();
      expect(prismaMock.workspaceMemberRole.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            memberId: 'existing-member',
          }),
        }),
      );
    });
  });

  describe('RevokeWorkspaceInvitation', () => {
    it('should revoke a pending invitation within a transaction', async () => {
      const useCase = new RevokeWorkspaceInvitation(
        invitationRepo,
        mockAudit as any,
        mockOutbox as any,
        mockTransactionRunner as any,
      );

      prismaMock.invitation.findUnique.mockResolvedValue({
        id: 'invite-1',
        status: 'PENDING',
        workspaceId: 'ws-1',
      });

      await useCase.execute(
        {
          invitationId: 'invite-1',
          revokerPrincipalId: 'revoker-1',
        },
        mockContext,
      );

      expect(mockTransactionRunner.run).toHaveBeenCalledTimes(1);
      expect(prismaMock.invitation.upsert).toHaveBeenCalled();
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.anything(),
        mockContext,
        expect.anything(),
      );
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        expect.anything(),
        mockContext,
        expect.anything(),
      );
    });
  });
});
