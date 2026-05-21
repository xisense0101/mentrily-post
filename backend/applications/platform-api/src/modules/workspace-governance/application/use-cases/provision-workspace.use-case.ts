import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceRepository } from '../../domain/repositories/workspace.repository.js';
import { WorkspaceMemberRepository } from '../../domain/repositories/workspace-member.repository.js';
import { WorkspaceRoleRepository } from '../../domain/repositories/workspace-role.repository.js';
import { ProvisionWorkspaceInput } from '@mentrily/contract-catalog';
import {
  Workspace,
  WorkspaceStatus,
  WorkspaceSlug,
  WorkspaceId,
  MembershipStatus,
  WorkspaceRole,
} from '../../domain/index.js';
import {
  AUDIT_RECORDER,
  OUTBOX_PUBLISHER,
  TRANSACTION_RUNNER,
  type AuditRecorder,
  type OutboxPublisher,
  type RequestContext,
  type TransactionRunner,
} from '@mentrily/service-core';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProvisionWorkspace {
  constructor(
    @Inject(WorkspaceRepository) private readonly workspaceRepo: WorkspaceRepository,
    @Inject(WorkspaceMemberRepository) private readonly memberRepo: WorkspaceMemberRepository,
    @Inject(WorkspaceRoleRepository) private readonly roleRepo: WorkspaceRoleRepository,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(OUTBOX_PUBLISHER) private readonly outbox: OutboxPublisher,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: ProvisionWorkspaceInput, context: RequestContext): Promise<string> {
    const workspaceId = uuidv4() as WorkspaceId;

    // 1. Check slug uniqueness (idempotency/guard) - Read outside if possible, but keep simple for now
    const existing = await this.workspaceRepo.findBySlug(new WorkspaceSlug(input.slug));
    if (existing) {
      throw new Error(`Workspace with slug ${input.slug} already exists`);
    }

    return await this.transactionRunner.run(async (tx) => {
      // 2. Create Workspace
      const workspace: Workspace = {
        id: workspaceId,
        name: input.name,
        slug: new WorkspaceSlug(input.slug),
        status: WorkspaceStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.workspaceRepo.save(workspace, tx);

      // 3. Create Default 'Owner' Role for this workspace
      const ownerRole: WorkspaceRole = {
        id: uuidv4(),
        workspaceId,
        name: 'Workspace Owner',
        key: 'workspace_owner',
        isSystem: true,
        createdAt: new Date(),
      };
      await this.roleRepo.save(ownerRole, tx);

      // 4. Add Owner Member
      const memberId = uuidv4();
      await this.memberRepo.save(
        {
          id: memberId,
          workspaceId,
          principalId: input.ownerPrincipalId,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        tx,
      );

      // 5. Assign Owner Role to Owner Member
      await this.memberRepo.assignRole(memberId, ownerRole.id, tx);

      // 6. Audit and Outbox
      await this.audit.record(
        {
          action: 'workspace.provisioned',
          actorId: input.ownerPrincipalId,
          targetType: 'workspace',
          targetId: workspaceId,
          metadata: { slug: input.slug },
        },
        context,
        tx,
      );

      await this.outbox.publish(
        {
          eventId: uuidv4(),
          eventName: 'workspace.created',
          eventVersion: 1,
          correlationId: context.correlationId,
          occurredAt: new Date().toISOString(),
          workspaceId: workspaceId,
          payload: { workspaceId, ownerId: input.ownerPrincipalId },
        },
        context,
        tx,
      );

      return workspaceId;
    });
  }
}
