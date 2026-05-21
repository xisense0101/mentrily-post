import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceMemberRepository } from '../../domain/repositories/workspace-member.repository.js';
import { WorkspaceRoleRepository } from '../../domain/repositories/workspace-role.repository.js';
import { AssignWorkspaceRoleInput } from '@mentrily/contract-catalog';
import {
  AUDIT_RECORDER,
  OUTBOX_PUBLISHER,
  TRANSACTION_RUNNER,
  type AuditRecorder,
  type OutboxPublisher,
  type RequestContext,
  type TransactionRunner,
  AppError,
} from '@mentrily/service-core';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AssignWorkspaceRole {
  constructor(
    @Inject(WorkspaceMemberRepository) private readonly memberRepo: WorkspaceMemberRepository,
    @Inject(WorkspaceRoleRepository) private readonly roleRepo: WorkspaceRoleRepository,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(OUTBOX_PUBLISHER) private readonly outbox: OutboxPublisher,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: AssignWorkspaceRoleInput, context: RequestContext): Promise<void> {
    const actorId = context.workspace?.actorId;
    if (!actorId) {
      throw new AppError('UNAUTHORIZED', 'Missing actor in workspace context.', 401);
    }

    return await this.transactionRunner.run(async (tx) => {
      const role = await this.roleRepo.findByKey(input.workspaceId as any, input.roleKey, tx);
      if (!role) {
        throw new Error(`Role ${input.roleKey} not found in workspace ${input.workspaceId}`);
      }

      // Assign role to member
      await this.memberRepo.assignRole(input.memberId, role.id, tx);

      await this.audit.record(
        {
          action: 'member.role_assigned',
          actorId,
          targetType: 'workspace_member_role',
          targetId: input.memberId,
          metadata: { workspaceId: input.workspaceId, roleKey: input.roleKey },
        },
        context,
        tx,
      );

      await this.outbox.publish(
        {
          eventId: uuidv4(),
          eventName: 'workspace.role_assigned',
          eventVersion: 1,
          correlationId: context.correlationId,
          occurredAt: new Date().toISOString(),
          workspaceId: input.workspaceId,
          payload: {
            workspaceId: input.workspaceId,
            memberId: input.memberId,
            roleKey: input.roleKey,
          },
        },
        context,
        tx,
      );
    });
  }
}
