import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { WorkspacePermissionEvaluator } from '../infrastructure/security/workspace-permission.evaluator.js';
import { WorkspaceMemberRepository } from '../domain/repositories/workspace-member.repository.js';
import { RequestContext } from '@mentrily/service-core';
import { MembershipStatus } from '../domain/value-objects/index.js';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AddWorkspaceMember } from '../application/use-cases/add-workspace-member.use-case.js';
import { AssignWorkspaceRole } from '../application/use-cases/assign-workspace-role.use-case.js';
import { RemoveWorkspaceMember } from '../application/use-cases/remove-workspace-member.use-case.js';

describe('WorkspacePermissionEvaluator', () => {
  let evaluator: WorkspacePermissionEvaluator;
  let mockMemberRepo: Mocked<WorkspaceMemberRepository>;

  beforeEach(() => {
    mockMemberRepo = {
      findById: vi.fn(),
      findByWorkspaceAndPrincipal: vi.fn(),
      findAllByWorkspaceId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      assignRole: vi.fn(),
      getMemberRoles: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    evaluator = new WorkspacePermissionEvaluator(mockMemberRepo);
  });

  const createContext = (workspaceId?: string, actorId?: string): RequestContext => {
    const ctx: RequestContext = {
      requestId: 'test-req',
      correlationId: 'test-cor',
      timestamp: new Date().toISOString(),
    };
    if (workspaceId) {
      ctx.workspace = { tenantId: 't1', workspaceId, ...(actorId ? { actorId } : {}) };
    }
    return ctx;
  };

  it('should deny missing workspace context', async () => {
    const result = await evaluator.evaluate(
      { permission: PermissionCatalog.WORKSPACE_READ },
      createContext(), // no workspace
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Missing workspace context');
  });

  it('should deny missing actorId', async () => {
    const result = await evaluator.evaluate(
      { permission: PermissionCatalog.WORKSPACE_READ },
      createContext('w1'), // no actor
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Missing actor');
  });

  it('should deny invalid permission key', async () => {
    const result = await evaluator.evaluate(
      { permission: 'invalid_format' },
      createContext('w1', 'u1'),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Invalid permission format');
  });

  it('should deny if not a member', async () => {
    mockMemberRepo.findByWorkspaceAndPrincipal.mockResolvedValue(null);
    const result = await evaluator.evaluate(
      { permission: PermissionCatalog.WORKSPACE_READ },
      createContext('w1', 'u1'),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not a member');
  });

  it('should deny if member is suspended or removed', async () => {
    mockMemberRepo.findByWorkspaceAndPrincipal.mockResolvedValue({
      id: 'm1',
      status: MembershipStatus.INACTIVE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await evaluator.evaluate(
      { permission: PermissionCatalog.WORKSPACE_READ },
      createContext('w1', 'u1'),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Membership is not active');
  });

  it('should deny if member has no roles', async () => {
    mockMemberRepo.findByWorkspaceAndPrincipal.mockResolvedValue({
      id: 'm1',
      status: MembershipStatus.ACTIVE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockMemberRepo.getMemberRoles.mockResolvedValue([]);

    const result = await evaluator.evaluate(
      { permission: PermissionCatalog.WORKSPACE_READ },
      createContext('w1', 'u1'),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('no assigned roles');
  });

  it('should deny if member lacks permission for role', async () => {
    mockMemberRepo.findByWorkspaceAndPrincipal.mockResolvedValue({
      id: 'm1',
      status: MembershipStatus.ACTIVE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockMemberRepo.getMemberRoles.mockResolvedValue(['learner']);

    const result = await evaluator.evaluate(
      { permission: PermissionCatalog.WORKSPACE_ROLES_MANAGE },
      createContext('w1', 'u1'),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Missing required permission');
  });

  it('should allow if member role grants permission', async () => {
    mockMemberRepo.findByWorkspaceAndPrincipal.mockResolvedValue({
      id: 'm1',
      status: MembershipStatus.ACTIVE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // workspace_owner has WORKSPACE_ROLES_MANAGE
    mockMemberRepo.getMemberRoles.mockResolvedValue(['workspace_owner']);

    const result = await evaluator.evaluate(
      { permission: PermissionCatalog.WORKSPACE_ROLES_MANAGE },
      createContext('w1', 'u1'),
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should allow through multiple role expansion', async () => {
    mockMemberRepo.findByWorkspaceAndPrincipal.mockResolvedValue({
      id: 'm1',
      status: MembershipStatus.ACTIVE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // learner lacks CONTENT_CREATE, but creator has it
    mockMemberRepo.getMemberRoles.mockResolvedValue(['learner', 'creator']);

    const result = await evaluator.evaluate(
      { permission: PermissionCatalog.CONTENT_CREATE },
      createContext('w1', 'u1'),
    );
    expect(result.allowed).toBe(true);
  });

  it('should allow learner result read for learner role and deny result release', async () => {
    mockMemberRepo.findByWorkspaceAndPrincipal.mockResolvedValue({
      id: 'm1',
      status: MembershipStatus.ACTIVE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockMemberRepo.getMemberRoles.mockResolvedValue(['learner']);

    const readOwn = await evaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_RESULT_READ_OWN },
      createContext('w1', 'u1'),
    );
    expect(readOwn.allowed).toBe(true);

    const release = await evaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_RESULT_RELEASE },
      createContext('w1', 'u1'),
    );
    expect(release.allowed).toBe(false);
    expect(release.reason).toContain('Missing required permission');
  });

  it('should allow learner course delivery read for learner role', async () => {
    mockMemberRepo.findByWorkspaceAndPrincipal.mockResolvedValue({
      id: 'm1',
      status: MembershipStatus.ACTIVE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockMemberRepo.getMemberRoles.mockResolvedValue(['learner']);

    const result = await evaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_COURSE_DELIVERY_READ },
      createContext('w1', 'u1'),
    );

    expect(result.allowed).toBe(true);
  });

  it('should allow creator result release and workspace result read', async () => {
    mockMemberRepo.findByWorkspaceAndPrincipal.mockResolvedValue({
      id: 'm1',
      status: MembershipStatus.ACTIVE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockMemberRepo.getMemberRoles.mockResolvedValue(['creator']);

    const release = await evaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_RESULT_RELEASE },
      createContext('w1', 'u1'),
    );
    expect(release.allowed).toBe(true);

    const readWorkspace = await evaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_RESULT_READ_WORKSPACE },
      createContext('w1', 'u1'),
    );
    expect(readWorkspace.allowed).toBe(true);
  });

  it('privileged workspace actions must throw when workspace.actorId is missing', async () => {
    // AddWorkspaceMember
    const mockMemberRepo: any = {
      findByWorkspaceAndPrincipal: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue({ id: 'm1' }),
    };
    const mockAudit: any = { record: vi.fn() };
    const mockOutbox: any = { publish: vi.fn() };

    const mockTransactionRunner: any = { run: vi.fn(async (op: any) => op({})) };
    const addUseCase = new AddWorkspaceMember(
      mockMemberRepo,
      mockAudit,
      mockOutbox,
      mockTransactionRunner,
    );

    const missingActorContext: RequestContext = {
      requestId: 'r',
      correlationId: 'c',
      timestamp: new Date().toISOString(),
      workspace: { tenantId: 't1', workspaceId: 'w1' }, // no actorId
    };

    await expect(
      addUseCase.execute({ workspaceId: 'w1', principalId: 'p1' } as any, missingActorContext),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Missing actor in workspace context.',
      statusCode: 401,
    });
    expect(mockMemberRepo.save).not.toHaveBeenCalled();
    expect(mockAudit.record).not.toHaveBeenCalled();
    expect(mockOutbox.publish).not.toHaveBeenCalled();

    // AssignWorkspaceRole
    const mockRoleRepo: any = { findByKey: vi.fn().mockResolvedValue({ id: 'r1' }) };
    const mockMemberRepo2: any = { assignRole: vi.fn() };
    const assignUseCase = new AssignWorkspaceRole(
      mockMemberRepo2,
      mockRoleRepo,
      mockAudit,
      mockOutbox,
      mockTransactionRunner,
    );

    await expect(
      assignUseCase.execute(
        { workspaceId: 'w1', memberId: 'm1', roleKey: 'workspace_owner' } as any,
        missingActorContext,
      ),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Missing actor in workspace context.',
      statusCode: 401,
    });
    expect(mockMemberRepo2.assignRole).not.toHaveBeenCalled();

    // RemoveWorkspaceMember
    const mockMemberRepo3: any = {
      findById: vi.fn().mockResolvedValue({ id: 'm1', workspaceId: 'w1' }),
      save: vi.fn(),
    };
    const removeUseCase = new RemoveWorkspaceMember(
      mockMemberRepo3,
      mockAudit,
      mockOutbox,
      mockTransactionRunner,
    );

    await expect(
      removeUseCase.execute({ workspaceId: 'w1', memberId: 'm1' } as any, missingActorContext),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Missing actor in workspace context.',
      statusCode: 401,
    });
    expect(mockMemberRepo3.save).not.toHaveBeenCalled();
  });

  it('audit records should receive supplied actorId when present', async () => {
    const mockAudit: any = { record: vi.fn() };
    const mockOutbox: any = { publish: vi.fn() };

    // AddWorkspaceMember happy path
    const mockMemberRepo: any = {
      findByWorkspaceAndPrincipal: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue({ id: 'm1' }),
    };
    const mockTransactionRunner: any = { run: vi.fn(async (op: any) => op({})) };
    const addUseCase = new AddWorkspaceMember(
      mockMemberRepo,
      mockAudit,
      mockOutbox,
      mockTransactionRunner,
    );
    const ctxWithActor: RequestContext = {
      requestId: 'r2',
      correlationId: 'c2',
      timestamp: new Date().toISOString(),
      workspace: { tenantId: 't1', workspaceId: 'w1', actorId: 'actor-123' },
    };

    await addUseCase.execute({ workspaceId: 'w1', principalId: 'p1' } as any, ctxWithActor);
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'actor-123' }),
      ctxWithActor,
      expect.anything(),
    );

    // AssignWorkspaceRole happy path
    const mockRoleRepo: any = { findByKey: vi.fn().mockResolvedValue({ id: 'r1' }) };
    const mockMemberRepo2: any = { assignRole: vi.fn() };
    const assignUseCase = new AssignWorkspaceRole(
      mockMemberRepo2,
      mockRoleRepo,
      mockAudit,
      mockOutbox,
      mockTransactionRunner,
    );

    await assignUseCase.execute(
      { workspaceId: 'w1', memberId: 'm1', roleKey: 'workspace_owner' } as any,
      ctxWithActor,
    );
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'actor-123' }),
      ctxWithActor,
      expect.anything(),
    );

    // RemoveWorkspaceMember happy path
    const mockMemberRepo3: any = {
      findById: vi.fn().mockResolvedValue({ id: 'm1', workspaceId: 'w1' }),
      save: vi.fn(),
    };
    const removeUseCase = new RemoveWorkspaceMember(
      mockMemberRepo3,
      mockAudit,
      mockOutbox,
      mockTransactionRunner,
    );

    await removeUseCase.execute({ workspaceId: 'w1', memberId: 'm1' } as any, ctxWithActor);
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'actor-123' }),
      ctxWithActor,
      expect.anything(),
    );
  });
});
