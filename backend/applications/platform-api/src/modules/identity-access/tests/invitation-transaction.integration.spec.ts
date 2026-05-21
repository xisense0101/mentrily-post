import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
// Use direct relative paths
import {
  PrismaTransactionRunner,
  PrismaAuditRecorder,
  PrismaOutboxPublisher,
  AuditRecordRepository,
  OutboxRepository,
} from '@mentrily/data-platform';
import { PrismaInvitationRepository } from '../infrastructure/persistence/prisma/prisma-invitation.repository.js';
import { PrismaWorkspaceMemberRepository } from '../../workspace-governance/infrastructure/persistence/prisma/prisma-workspace-member.repository.js';
import { PrismaWorkspaceRoleRepository } from '../../workspace-governance/infrastructure/persistence/prisma/prisma-workspace-role.repository.js';
import { AcceptWorkspaceInvitation } from '../application/use-cases/accept-workspace-invitation.use-case.js';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';

describe('AcceptWorkspaceInvitation (Durable Rollback Integration)', () => {
  let prisma: PrismaClient;
  let invitationRepo: PrismaInvitationRepository;
  let memberRepo: PrismaWorkspaceMemberRepository;
  let roleRepo: PrismaWorkspaceRoleRepository;
  let auditRecorder: PrismaAuditRecorder;
  let outboxPublisher: PrismaOutboxPublisher;
  let transactionRunner: PrismaTransactionRunner;
  let useCase: AcceptWorkspaceInvitation;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    const prismaAny = prisma as any;

    // Core repositories
    invitationRepo = new PrismaInvitationRepository(prismaAny);
    memberRepo = new PrismaWorkspaceMemberRepository(prismaAny);
    roleRepo = new PrismaWorkspaceRoleRepository(prismaAny);

    // Durable repositories
    const auditRepo = new AuditRecordRepository(prismaAny);
    const outboxRepo = new OutboxRepository(prismaAny);

    // Adapters (using real repositories)
    auditRecorder = new PrismaAuditRecorder(auditRepo);
    outboxPublisher = new PrismaOutboxPublisher(outboxRepo);
    transactionRunner = new PrismaTransactionRunner(prismaAny);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma as any);

    useCase = new AcceptWorkspaceInvitation(
      invitationRepo,
      memberRepo,
      roleRepo,
      auditRecorder,
      outboxPublisher,
      transactionRunner,
    );
  });

  const createContext = (workspaceId: string, tenantId: string, actorId: string): any => ({
    requestId: randomUUID(),
    correlationId: randomUUID(),
    timestamp: new Date().toISOString(),
    workspace: {
      workspaceId,
      tenantId,
      actorId,
    },
  });

  async function setupTestData() {
    const principalId = randomUUID();
    const inviterId = randomUUID();
    const workspaceId = randomUUID();
    const roleId = randomUUID();
    const invitationId = randomUUID();

    await prisma.principal.create({
      data: { id: principalId, email: `${principalId}@example.com` },
    });
    await prisma.principal.create({ data: { id: inviterId, email: `${inviterId}@example.com` } });
    await prisma.workspace.create({
      data: { id: workspaceId, name: 'Test WS', slug: `test-ws-${workspaceId}` },
    });
    await prisma.workspaceRole.create({
      data: { id: roleId, workspaceId, key: 'admin', name: 'Admin' },
    });
    await prisma.invitation.create({
      data: {
        id: invitationId,
        workspaceId,
        email: `${principalId}@example.com`,
        roleKey: 'admin',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
        token: randomUUID(),
        inviterPrincipalId: inviterId,
      },
    });

    return { principalId, workspaceId, roleId, invitationId, tenantId: randomUUID() };
  }

  it('should successfully accept an invitation and persist all durable side-effects', async () => {
    const { principalId, invitationId, workspaceId, tenantId } = await setupTestData();
    const context = createContext(workspaceId, tenantId, principalId);

    await useCase.execute({ invitationId, principalId }, context);

    // 1. Verify primary mutation
    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
    expect(invitation?.status).toBe('ACCEPTED');

    // 2. Verify downstream domain state
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, principalId },
    });
    expect(member).toBeDefined();

    // 3. Verify durable audit
    const auditCount = await prisma.auditRecord.count({
      where: { workspaceId, action: 'invitation.accepted' },
    });
    expect(auditCount).toBe(1);

    // 4. Verify durable outbox
    const outboxCount = await prisma.outboxMessage.count({
      where: { workspaceId, eventName: 'workspace.invitation_accepted' },
    });
    expect(outboxCount).toBe(1);
  });

  it('should rollback primary AND durable side-effects if a later write fails', async () => {
    const { principalId, invitationId, workspaceId, tenantId } = await setupTestData();
    const context = createContext(workspaceId, tenantId, principalId);

    vi.spyOn(outboxPublisher, 'publish').mockRejectedValueOnce(
      new Error('Simulated Downstream Failure'),
    );

    await expect(useCase.execute({ invitationId, principalId }, context)).rejects.toThrow(
      'Simulated Downstream Failure',
    );

    // 1. Verify primary mutation rolled back
    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
    expect(invitation?.status).toBe('PENDING');

    // 2. Verify member rolled back
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, principalId },
    });
    expect(member).toBeNull();

    // 3. Verify DURABLE audit rolled back
    const auditCount = await prisma.auditRecord.count({
      where: { workspaceId },
    });
    expect(auditCount).toBe(0);

    // 4. Verify DURABLE outbox rolled back
    const outboxCount = await prisma.outboxMessage.count({
      where: { workspaceId },
    });
    expect(outboxCount).toBe(0);
  });
});
