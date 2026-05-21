import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestContext } from '@mentrily/service-core';
import { ProvisionWorkspace } from '../application/use-cases/provision-workspace.use-case.js';
import { AddWorkspaceMember } from '../application/use-cases/add-workspace-member.use-case.js';
import { AssignWorkspaceRole } from '../application/use-cases/assign-workspace-role.use-case.js';
import { RemoveWorkspaceMember } from '../application/use-cases/remove-workspace-member.use-case.js';
import { createPrismaMock } from '../../identity-access/tests/prisma-mock.js';
import { PrismaWorkspaceRepository } from '../infrastructure/persistence/prisma/prisma-workspace.repository.js';
import { PrismaWorkspaceMemberRepository } from '../infrastructure/persistence/prisma/prisma-workspace-member.repository.js';
import { PrismaWorkspaceRoleRepository } from '../infrastructure/persistence/prisma/prisma-workspace-role.repository.js';

describe('ProvisionWorkspace', () => {
  let useCase: ProvisionWorkspace;
  let prismaMock: any;

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

  beforeEach(() => {
    prismaMock = createPrismaMock();
    const workspaceRepo = new PrismaWorkspaceRepository(prismaMock as any);
    const memberRepo = new PrismaWorkspaceMemberRepository(prismaMock as any);
    const roleRepo = new PrismaWorkspaceRoleRepository(prismaMock as any);

    mockTransactionRunner.run.mockClear();
    mockAudit.record.mockReset();
    mockOutbox.publish.mockReset();

    useCase = new ProvisionWorkspace(
      workspaceRepo,
      memberRepo,
      roleRepo,
      mockAudit as any,
      mockOutbox as any,
      mockTransactionRunner as any,
    );
  });

  it('should provision a new workspace with owner role and member', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(null);

    const input = {
      name: 'Test Workspace',
      slug: 'test-workspace',
      ownerPrincipalId: 'owner-uuid',
    };

    const context: RequestContext = {
      requestId: 'req-123',
      correlationId: 'cor-123',
      timestamp: new Date().toISOString(),
    };

    const workspaceId = await useCase.execute(input, context);

    expect(workspaceId).toBeDefined();
    expect(prismaMock.workspace.upsert).toHaveBeenCalled();
    expect(prismaMock.workspaceRole.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          key: 'workspace_owner',
          workspaceId,
        }),
      }),
    );
    expect(prismaMock.workspaceMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          principalId: 'owner-uuid',
          workspaceId,
        }),
      }),
    );
    expect(prismaMock.workspaceMemberRole.upsert).toHaveBeenCalled();
    expect(mockTransactionRunner.run).toHaveBeenCalledTimes(1);
    expect(mockAudit.record).toHaveBeenCalledWith(expect.anything(), context, expect.anything());
    expect(mockOutbox.publish).toHaveBeenCalledWith(expect.anything(), context, expect.anything());
  });
});

describe('AddWorkspaceMember', () => {
  let useCase: AddWorkspaceMember;
  let prismaMock: any;
  let memberRepo: PrismaWorkspaceMemberRepository;

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

  beforeEach(() => {
    prismaMock = createPrismaMock();
    memberRepo = new PrismaWorkspaceMemberRepository(prismaMock as any);
    mockTransactionRunner.run.mockClear();
    mockAudit.record.mockReset();
    mockOutbox.publish.mockReset();

    useCase = new AddWorkspaceMember(
      memberRepo,
      mockAudit as any,
      mockOutbox as any,
      mockTransactionRunner as any,
    );
  });

  it('should add a new member within a transaction', async () => {
    const context: RequestContext = {
      requestId: 'req-1',
      correlationId: 'cor-1',
      timestamp: new Date().toISOString(),
      workspace: {
        tenantId: 'tenant-1',
        workspaceId: 'ws-1',
        actorId: 'actor-1',
      },
    };

    const input = {
      workspaceId: 'ws-1',
      principalId: 'principal-1',
    };

    prismaMock.workspaceMember.findUnique.mockResolvedValue(null);

    const memberId = await useCase.execute(input, context);

    expect(memberId).toBeDefined();
    expect(mockTransactionRunner.run).toHaveBeenCalledTimes(1);
    expect(prismaMock.workspaceMember.upsert).toHaveBeenCalled();
    expect(mockAudit.record).toHaveBeenCalledWith(expect.anything(), context, expect.anything());
    expect(mockOutbox.publish).toHaveBeenCalledWith(expect.anything(), context, expect.anything());
  });

  it('should throw if no actor is present', async () => {
    const context: RequestContext = {
      requestId: 'req-1',
      correlationId: 'cor-1',
      timestamp: new Date().toISOString(),
    };

    const input = {
      workspaceId: 'ws-1',
      principalId: 'principal-1',
    };

    await expect(useCase.execute(input, context)).rejects.toThrow('Missing actor');
    expect(mockTransactionRunner.run).not.toHaveBeenCalled();
  });
});

describe('AssignWorkspaceRole', () => {
  let useCase: AssignWorkspaceRole;
  let prismaMock: any;
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

  beforeEach(() => {
    prismaMock = createPrismaMock();
    memberRepo = new PrismaWorkspaceMemberRepository(prismaMock as any);
    roleRepo = new PrismaWorkspaceRoleRepository(prismaMock as any);
    mockTransactionRunner.run.mockClear();
    mockAudit.record.mockReset();
    mockOutbox.publish.mockReset();

    useCase = new AssignWorkspaceRole(
      memberRepo,
      roleRepo,
      mockAudit as any,
      mockOutbox as any,
      mockTransactionRunner as any,
    );
  });

  it('should assign a role within a transaction', async () => {
    const context: RequestContext = {
      requestId: 'req-1',
      correlationId: 'cor-1',
      timestamp: new Date().toISOString(),
      workspace: {
        tenantId: 'tenant-1',
        workspaceId: 'ws-1',
        actorId: 'actor-1',
      },
    };

    const input = {
      workspaceId: 'ws-1',
      memberId: 'member-1',
      roleKey: 'admin',
    };

    prismaMock.workspaceRole.findUnique.mockResolvedValue({ id: 'role-1', key: 'admin' });

    await useCase.execute(input, context);

    expect(mockTransactionRunner.run).toHaveBeenCalledTimes(1);
    expect(prismaMock.workspaceMemberRole.upsert).toHaveBeenCalled();
    expect(mockAudit.record).toHaveBeenCalledWith(expect.anything(), context, expect.anything());
    expect(mockOutbox.publish).toHaveBeenCalledWith(expect.anything(), context, expect.anything());
  });
});

describe('RemoveWorkspaceMember', () => {
  let useCase: RemoveWorkspaceMember;
  let prismaMock: any;
  let memberRepo: PrismaWorkspaceMemberRepository;

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

  beforeEach(() => {
    prismaMock = createPrismaMock();
    memberRepo = new PrismaWorkspaceMemberRepository(prismaMock as any);
    mockTransactionRunner.run.mockClear();
    mockAudit.record.mockReset();
    mockOutbox.publish.mockReset();

    useCase = new RemoveWorkspaceMember(
      memberRepo,
      mockAudit as any,
      mockOutbox as any,
      mockTransactionRunner as any,
    );
  });

  it('should remove a member within a transaction', async () => {
    const context: RequestContext = {
      requestId: 'req-1',
      correlationId: 'cor-1',
      timestamp: new Date().toISOString(),
      workspace: {
        tenantId: 'tenant-1',
        workspaceId: 'ws-1',
        actorId: 'actor-1',
      },
    };

    const input = {
      workspaceId: 'ws-1',
      memberId: 'member-1',
    };

    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      id: 'member-1',
      workspaceId: 'ws-1',
    });

    await useCase.execute(input, context);

    expect(mockTransactionRunner.run).toHaveBeenCalledTimes(1);
    expect(prismaMock.workspaceMember.upsert).toHaveBeenCalled();
    expect(mockAudit.record).toHaveBeenCalledWith(expect.anything(), context, expect.anything());
    expect(mockOutbox.publish).toHaveBeenCalledWith(expect.anything(), context, expect.anything());
  });
});
