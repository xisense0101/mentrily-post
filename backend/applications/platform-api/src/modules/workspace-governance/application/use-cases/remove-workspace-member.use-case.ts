import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceMemberRepository } from '../../domain/repositories/workspace-member.repository.js';
import { RemoveWorkspaceMemberInput } from '@mentrily/contract-catalog';
import { MembershipStatus } from '../../domain/index.js';
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
export class RemoveWorkspaceMember {
  constructor(
    @Inject(WorkspaceMemberRepository) private readonly memberRepo: WorkspaceMemberRepository,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(OUTBOX_PUBLISHER) private readonly outbox: OutboxPublisher,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: RemoveWorkspaceMemberInput, context: RequestContext): Promise<void> {
    const actorId = context.workspace?.actorId;
    if (!actorId) {
      throw new AppError('UNAUTHORIZED', 'Missing actor in workspace context.', 401);
    }

    return await this.transactionRunner.run(async (tx) => {
      const member = await this.memberRepo.findById(input.memberId as any, tx);
      if (!member || member.workspaceId !== input.workspaceId) {
        return; // Already removed or not in this workspace
      }

      member.status = MembershipStatus.REMOVED;
      await this.memberRepo.save(member, tx);

      await this.audit.record(
        {
          action: 'member.removed',
          actorId,
          targetType: 'workspace_member',
          targetId: input.memberId,
          metadata: { workspaceId: input.workspaceId },
        },
        context,
        tx,
      );

      await this.outbox.publish(
        {
          eventId: uuidv4(),
          eventName: 'workspace.member_removed',
          eventVersion: 1,
          correlationId: context.correlationId,
          occurredAt: new Date().toISOString(),
          workspaceId: input.workspaceId,
          payload: { workspaceId: input.workspaceId, memberId: input.memberId },
        },
        context,
        tx,
      );
    });
  }
}
